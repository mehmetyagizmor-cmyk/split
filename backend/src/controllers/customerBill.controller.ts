import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sumLineItems } from "../lib/money";

/**
 * GET /api/customer/bill
 * O an giriş yapmış müşterinin KİŞİSEL hesabı:
 *   kişisel ürünler (isShared=false, kendi siparişleri)
 * + ortak ürünlerden payı (SharedItemParticipant, kim sipariş verdiğine bakılmaksızın)
 * + servis ücreti (restoranın serviceFeePercent'i, ikisinin toplamı üzerinden)
 * = ödenecek toplam (bahşiş hariç — bahşiş ödeme ekranında eklenecek, Phase 11)
 */
export async function getMyBill(req: Request, res: Response) {
  const { customerSessionId, restaurantId } = req.customerSession!;

  const [restaurant, personalOrders, sharedParticipations] = await Promise.all([
    prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { serviceFeePercent: true },
    }),
    prisma.order.findMany({
      where: { customerSessionId, status: { not: "CANCELLED" } },
      select: {
        items: {
          where: { isShared: false },
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            menuItem: { select: { name: true } },
          },
        },
      },
    }),
    prisma.sharedItemParticipant.findMany({
      where: {
        customerSessionId,
        orderItem: { order: { status: { not: "CANCELLED" } } },
      },
      select: {
        id: true,
        shareAmount: true,
        orderItem: { select: { menuItem: { select: { name: true } } } },
      },
    }),
  ]);

  const personalItems = personalOrders.flatMap((order) =>
    order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
    })),
  );
  const personalSubtotal = sumLineItems(personalOrders.flatMap((o) => o.items));

  const sharedItems = sharedParticipations.map((p) => ({
    id: p.id,
    name: p.orderItem.menuItem.name,
    shareAmount: p.shareAmount.toFixed(2),
  }));
  const sharedSubtotal = sharedParticipations.reduce(
    (sum, p) => sum.plus(p.shareAmount),
    new Prisma.Decimal(0),
  );

  const itemsSubtotal = personalSubtotal.plus(sharedSubtotal);
  const serviceFeeAmount = itemsSubtotal
    .times(restaurant.serviceFeePercent)
    .dividedBy(100);
  const total = itemsSubtotal.plus(serviceFeeAmount);

  res.json({
    personalItems,
    personalSubtotal: personalSubtotal.toFixed(2),
    sharedItems,
    sharedSubtotal: sharedSubtotal.toFixed(2),
    serviceFeePercent: restaurant.serviceFeePercent.toFixed(2),
    serviceFeeAmount: serviceFeeAmount.toFixed(2),
    total: total.toFixed(2),
  });
}
