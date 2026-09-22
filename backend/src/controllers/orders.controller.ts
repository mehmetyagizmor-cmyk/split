import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { splitEvenly } from "../lib/money";
import { paymentProvider } from "../lib/paymentProvider";
import { getIO, billRoom } from "../lib/socket";
import {
  createOrderForCustomerSession,
  validateAndPriceItems,
  serializeOrder,
  type OrderItemInput,
} from "../lib/orderCreation";

/**
 * POST /api/orders
 * requireCustomerSession'dan sonra çalışır — sipariş her zaman o an giriş
 * yapmış müşteriye ve onun masasının açık Bill'ine bağlanır, body'de bill/masa
 * bilgisi asla istemciden alınmaz (kimse başka bir masaya sipariş yazamaz).
 *
 * ÖDEME ÖNCE, SİPARİŞ SONRA: müşteri "sepeti onaylama"nın tutarını burada
 * hemen öder — sipariş mutfağa/personele gitmeden önce ödeme başarılı
 * olmalı. Ödeme başarısız olursa sipariş HİÇ oluşturulmaz; böylece bir
 * müşterinin sipariş verip ödemeden masadan kalkması engellenmiş olur.
 */
export async function createOrder(req: Request, res: Response) {
  const { items } = req.body as { items: OrderItemInput[] };
  const { customerSessionId, billId, restaurantId } = req.customerSession!;

  const [{ itemsAmount }, restaurant] = await Promise.all([
    validateAndPriceItems(restaurantId, items),
    prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { serviceFeePercent: true },
    }),
  ]);

  const serviceFeeAmount = itemsAmount
    .times(restaurant.serviceFeePercent)
    .dividedBy(100);
  const totalAmount = itemsAmount.plus(serviceFeeAmount);

  const chargeResult = await paymentProvider.charge(totalAmount.toFixed(2));

  if (!chargeResult.success) {
    // orderId boş bırakılıyor — bu ödeme denemesi hiçbir siparişe bağlanmadı,
    // çünkü sipariş henüz oluşturulmadı.
    await prisma.payment.create({
      data: {
        restaurantId,
        billId,
        customerSessionId,
        itemsAmount,
        serviceFeeAmount,
        totalAmount,
        status: "FAILED",
      },
    });
    throw new ApiError(402, "Ödeme başarısız oldu, sipariş oluşturulamadı");
  }

  const order = await createOrderForCustomerSession({
    restaurantId,
    billId,
    customerSessionId,
    items,
  });

  await prisma.payment.create({
    data: {
      restaurantId,
      billId,
      customerSessionId,
      orderId: order.id,
      itemsAmount,
      serviceFeeAmount,
      totalAmount,
      status: "PAID",
      paidAt: new Date(),
    },
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
    payments: { where: { status: "PAID" }; select: { id: true } };
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
  // Sipariş verilirken peşin ödenmiş siparişlerin ürünleri artık paylaşılamaz
  // — frontend bu bayrağa bakıp "Paylaştır" butonunu gizliyor.
  const isPaid = order.payments.length > 0;

  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    orderedBy: { id: order.customerSession.id, name: order.customerSession.name },
    isPaid,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
      isShared: item.isShared,
      isPaid,
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
      payments: { where: { status: "PAID" }, select: { id: true } },
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
    include: {
      order: {
        select: { billId: true, payments: { where: { status: "PAID" }, select: { id: true } } },
      },
    },
  });

  // Ürün gerçekten bu müşterinin masasının (bill'inin) siparişlerinden biri mi?
  // Değilse — id doğru ama başka bir masaya aitse — 404 dönüp varlığını bile
  // sızdırmıyoruz.
  if (!orderItem || orderItem.order.billId !== billId) {
    throw new ApiError(404, "Sipariş kalemi bulunamadı");
  }

  // Sipariş verilirken peşin ödenmiş ürünler artık paylaşılamaz — ödeyen kişi
  // zaten tam tutarı ödedi, sonradan paylaştırmak restoranı ürünün tutarını
  // hem ödeyenden hem paylaşanlardan iki kez almış hale getirir.
  if (orderItem.order.payments.length > 0) {
    throw new ApiError(400, "Bu ürün zaten ödendi, artık paylaşılamaz");
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
