import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { splitEvenly } from "../lib/money";
import { getIO, billRoom } from "../lib/socket";
import {
  createOrderForCustomerSession,
  serializeOrder,
  type OrderItemInput,
} from "../lib/orderCreation";

/**
 * POST /api/orders
 * requireCustomerSession'dan sonra çalışır — sipariş her zaman o an giriş
 * yapmış müşteriye ve onun masasının açık Bill'ine bağlanır, body'de bill/masa
 * bilgisi asla istemciden alınmaz (kimse başka bir masaya sipariş yazamaz).
 */
export async function createOrder(req: Request, res: Response) {
  const { items } = req.body as { items: OrderItemInput[] };
  const { customerSessionId, billId, restaurantId } = req.customerSession!;

  const order = await createOrderForCustomerSession({
    restaurantId,
    billId,
    customerSessionId,
    items,
  });

  res.status(201).json({ order });
}

/** GET /api/orders/my — sadece o an giriş yapmış müşterinin kendi siparişleri. */
export async function getMyOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { customerSessionId: req.customerSession!.customerSessionId },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { menuItem: { select: { name: true } } } } },
  });

  res.json({ orders: orders.map(serializeOrder) });
}

type BillOrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customerSession: { select: { id: true; name: true } };
    items: {
      include: {
        menuItem: { select: { name: true } };
        sharedParticipants: {
          include: { customerSession: { select: { id: true; name: true } } };
        };
      };
    };
  };
}>;

function serializeBillOrder(order: BillOrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    orderedBy: { id: order.customerSession.id, name: order.customerSession.name },
    items: order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
      isShared: item.isShared,
      sharedWith: item.sharedParticipants.map((p) => ({
        customerSessionId: p.customerSession.id,
        name: p.customerSession.name,
        shareAmount: p.shareAmount.toFixed(2),
      })),
    })),
  };
}

/**
 * GET /api/orders/bill
 * O an açık olan Bill'e ait TÜM siparişler (sadece kendi siparişlerim değil) —
 * "ortak ürün" işaretlemek için masadaki herkesin siparişini görmek gerekiyor.
 */
export async function getBillOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { billId: req.customerSession!.billId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: {
      customerSession: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: { select: { name: true } },
          sharedParticipants: {
            include: { customerSession: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  res.json({ orders: orders.map(serializeBillOrder) });
}

/**
 * POST /api/orders/items/:orderItemId/share
 * Bir sipariş kalemini masadaki seçilen kişiler arasında böler.
 * customerSessionIds boş gönderilirse paylaşım kaldırılır (isShared=false).
 */
export async function shareOrderItem(req: Request, res: Response) {
  const { orderItemId } = req.params as { orderItemId: string };
  const { customerSessionIds } = req.body as { customerSessionIds: string[] };
  const { billId } = req.customerSession!;

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { billId: true } } },
  });

  // Ürün gerçekten bu müşterinin masasının (bill'inin) siparişlerinden biri mi?
  // Değilse — id doğru ama başka bir masaya aitse — 404 dönüp varlığını bile
  // sızdırmıyoruz.
  if (!orderItem || orderItem.order.billId !== billId) {
    throw new ApiError(404, "Sipariş kalemi bulunamadı");
  }

  if (customerSessionIds.length > 0) {
    // Seçilen katılımcıların hepsi GERÇEKTEN aynı masanın (bill'in) müşterileri mi?
    const validCount = await prisma.customerSession.count({
      where: { id: { in: customerSessionIds }, billId },
    });
    if (validCount !== new Set(customerSessionIds).size) {
      throw new ApiError(400, "Geçersiz katılımcı seçildi");
    }
  }

  const lineTotal = orderItem.unitPrice.times(orderItem.quantity);
  const shares = splitEvenly(lineTotal, customerSessionIds.length);

  await prisma.$transaction([
    prisma.sharedItemParticipant.deleteMany({ where: { orderItemId } }),
    prisma.orderItem.update({
      where: { id: orderItemId },
      data: { isShared: customerSessionIds.length > 0 },
    }),
    ...(customerSessionIds.length > 0
      ? [
          prisma.sharedItemParticipant.createMany({
            data: customerSessionIds.map((customerSessionId, i) => ({
              orderItemId,
              customerSessionId,
              shareAmount: shares[i],
            })),
          }),
        ]
      : []),
  ]);

  // Ürün paylaşıldı/paylaşımı kaldırıldı — masadaki herkesin hesabı
  // değişmiş olabilir, canlı bildirip ilgili ekranların yenilenmesini sağlıyoruz.
  getIO().to(billRoom(billId)).emit("item-shared", { orderItemId });

  res.json({ success: true });
}
