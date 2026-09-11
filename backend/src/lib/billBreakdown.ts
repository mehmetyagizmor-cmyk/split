import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { sumLineItems } from "./money";

/**
 * Bir müşterinin kişisel hesap dökümünü hesaplar — hem GET /api/customer/bill
 * hem ödeme oluşturma (POST /api/payments) TAM OLARAK aynı bu fonksiyonu
 * kullanır. Böylece "ekranda gördüğün tutar" ile "ödediğin tutar" arasında
 * asla bir tutarsızlık olamaz; ödeme anında istemciden bir subtotal/total
 * kabul ETMİYORUZ, sunucu her seferinde yeniden hesaplıyor.
 */
export async function computeBillBreakdown(
  customerSessionId: string,
  restaurantId: string,
) {
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
  const amountDue = itemsSubtotal.plus(serviceFeeAmount);

  return {
    personalItems,
    personalSubtotal,
    sharedItems,
    sharedSubtotal,
    serviceFeePercent: restaurant.serviceFeePercent,
    serviceFeeAmount,
    itemsSubtotal,
    amountDue, // bahşiş hariç ödenecek tutar
  };
}
