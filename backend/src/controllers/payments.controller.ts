import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { computeBillBreakdown } from "../lib/billBreakdown";
import { paymentProvider } from "../lib/paymentProvider";
import { getIO, billRoom, restaurantRoom } from "../lib/socket";

/**
 * POST /api/payments
 * Ödenecek tutar İSTEMCİDEN ASLA alınmaz — computeBillBreakdown ile sunucu
 * tarafında yeniden hesaplanır, sadece bahşiş miktarı müşteriden gelir.
 * Masadaki herkes ödediyse Bill + Table otomatik CLOSED'a çevrilir.
 */
export async function createPayment(req: Request, res: Response) {
  const { tipAmount: tipAmountInput } = req.body as { tipAmount: string };
  const { customerSessionId, restaurantId, billId, tableId, name } = req.customerSession!;

  const alreadyPaid = await prisma.payment.findFirst({
    where: { customerSessionId, status: "PAID" },
  });
  if (alreadyPaid) {
    throw new ApiError(409, "Zaten ödeme yaptınız");
  }

  const breakdown = await computeBillBreakdown(customerSessionId, restaurantId);
  const tipAmount = new Prisma.Decimal(tipAmountInput);
  const totalAmount = breakdown.amountDue.plus(tipAmount);

  const chargeResult = await paymentProvider.charge(totalAmount.toFixed(2));

  if (!chargeResult.success) {
    await prisma.payment.create({
      data: {
        restaurantId,
        billId,
        customerSessionId,
        itemsAmount: breakdown.itemsSubtotal,
        serviceFeeAmount: breakdown.serviceFeeAmount,
        tipAmount,
        totalAmount,
        status: "FAILED",
      },
    });
    throw new ApiError(402, "Ödeme başarısız oldu, lütfen tekrar deneyin");
  }

  const payment = await prisma.payment.create({
    data: {
      restaurantId,
      billId,
      customerSessionId,
      itemsAmount: breakdown.itemsSubtotal,
      serviceFeeAmount: breakdown.serviceFeeAmount,
      tipAmount,
      totalAmount,
      status: "PAID",
      paidAt: new Date(),
    },
  });

  // Masadaki HERKES (bu Bill'e bağlı her CustomerSession) ödediyse masayı kapat.
  const [allSessions, paidSessions] = await Promise.all([
    prisma.customerSession.findMany({ where: { billId }, select: { id: true } }),
    prisma.payment.findMany({
      where: { billId, status: "PAID" },
      select: { customerSessionId: true },
      distinct: ["customerSessionId"],
    }),
  ]);
  const paidSessionIds = new Set(paidSessions.map((p) => p.customerSessionId));
  const everyoneHasPaid = allSessions.every((s) => paidSessionIds.has(s.id));

  let billClosed = false;
  if (everyoneHasPaid) {
    await prisma.$transaction([
      prisma.bill.update({
        where: { id: billId },
        data: { status: "CLOSED", closedAt: new Date() },
      }),
      prisma.table.update({ where: { id: tableId }, data: { status: "CLOSED" } }),
    ]);
    billClosed = true;
  }

  const paymentPayload = { customerSessionId, name, billClosed, tableId };
  getIO().to(billRoom(billId)).emit("payment-made", paymentPayload);
  getIO().to(restaurantRoom(restaurantId)).emit("payment-made", paymentPayload);
  if (billClosed) {
    getIO().to(restaurantRoom(restaurantId)).emit("table-closed", { tableId });
  }

  res.status(201).json({
    payment: {
      id: payment.id,
      status: payment.status,
      itemsAmount: payment.itemsAmount.toFixed(2),
      serviceFeeAmount: payment.serviceFeeAmount.toFixed(2),
      tipAmount: payment.tipAmount.toFixed(2),
      totalAmount: payment.totalAmount.toFixed(2),
      paidAt: payment.paidAt,
    },
    billClosed,
  });
}
