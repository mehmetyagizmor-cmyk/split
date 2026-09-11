import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { sumLineItems, splitEvenly } from "../lib/money";
import { getIO, billRoom, restaurantRoom } from "../lib/socket";

type OrderItemInput = { menuItemId: string; quantity: number };

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { menuItem: { select: { name: true } } } } };
}>;

function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      // Satır toplamını burada Decimal ile hesaplayıp gönderiyoruz ki
      // frontend "birim fiyat * adet" işlemini kendi float aritmetiğiyle
      // tekrar yapmak zorunda kalmasın.
      lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
    })),
    total: sumLineItems(order.items).toFixed(2),
  };
}

/**
 * POST /api/orders
 * requireCustomerSession'dan sonra çalışır — sipariş her zaman o an giriş
 * yapmış müşteriye ve onun masasının açık Bill'ine bağlanır, body'de bill/masa
 * bilgisi asla istemciden alınmaz (kimse başka bir masaya sipariş yazamaz).
 */
export async function createOrder(req: Request, res: Response) {
  const { items } = req.body as { items: OrderItemInput[] };
  const { customerSessionId, billId, restaurantId } = req.customerSession!;

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];

  // Her ürünün GERÇEKTEN bu restorana ait ve hâlâ satışta olduğunu doğruluyoruz —
  // aksi halde biri isteği elle değiştirip başka bir restoranın ürününü ya da
  // menüden kaldırılmış bir ürünü sipariş edebilirdi.
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId, isAvailable: true },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new ApiError(
      400,
      "Bir veya daha fazla ürün bulunamadı ya da artık satışta değil",
    );
  }

  const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

  const order = await prisma.order.create({
    data: {
      restaurantId,
      billId,
      customerSessionId,
      items: {
        create: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          // Sipariş anındaki fiyatın anlık görüntüsü — menüdeki fiyat sonradan
          // değişse bile bu siparişin tutarı sabit kalır.
          unitPrice: menuItemById.get(i.menuItemId)!.price,
        })),
      },
    },
    include: { items: { include: { menuItem: { select: { name: true } } } } },
  });

  const serialized = serializeOrder(order);
  // Masadaki herkese (toplam güncellensin diye) ve — Phase 13'te kurulacak —
  // personel paneline yeni siparişi canlı bildir.
  getIO().to(billRoom(billId)).emit("order-created", serialized);
  getIO().to(restaurantRoom(restaurantId)).emit("order-created", serialized);

  res.status(201).json({ order: serialized });
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
