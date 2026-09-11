import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { computeBillBreakdown } from "../lib/billBreakdown";

/**
 * GET /api/customer/bill
 * O an giriş yapmış müşterinin kişisel hesap dökümü + varsa mevcut ödeme durumu.
 */
export async function getMyBill(req: Request, res: Response) {
  const { customerSessionId, restaurantId } = req.customerSession!;

  const [breakdown, latestPayment] = await Promise.all([
    computeBillBreakdown(customerSessionId, restaurantId),
    prisma.payment.findFirst({
      where: { customerSessionId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  res.json({
    personalItems: breakdown.personalItems,
    personalSubtotal: breakdown.personalSubtotal.toFixed(2),
    sharedItems: breakdown.sharedItems,
    sharedSubtotal: breakdown.sharedSubtotal.toFixed(2),
    serviceFeePercent: breakdown.serviceFeePercent.toFixed(2),
    serviceFeeAmount: breakdown.serviceFeeAmount.toFixed(2),
    amountDue: breakdown.amountDue.toFixed(2),
    payment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          tipAmount: latestPayment.tipAmount.toFixed(2),
          totalAmount: latestPayment.totalAmount.toFixed(2),
          paidAt: latestPayment.paidAt,
        }
      : null,
  });
}
