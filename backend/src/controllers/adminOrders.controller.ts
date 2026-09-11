import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { getIO, billRoom, restaurantRoom } from "../lib/socket";
import { createOrderForCustomerSession, type OrderItemInput } from "../lib/orderCreation";
import { sumLineItems } from "../lib/money";

type AdminOrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customerSession: { select: { name: true } };
    bill: { select: { table: { select: { id: true; label: true } } } };
    items: { include: { menuItem: { select: { name: true } } } };
  };
}>;

function serializeAdminOrder(order: AdminOrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    table: order.bill.table,
    customerName: order.customerSession.name,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
    })),
    total: sumLineItems(order.items).toFixed(2),
  };
}

/**
 * GET /api/admin/orders
 * Restoranın AÇIK masalarındaki tüm siparişler — personel paneli "gelen
 * siparişler" akışı. Kapanmış masaların (ödenmiş, tarihe karışmış) siparişleri
 * burada gösterilmiyor, dashboard'u şişirmesin diye.
 */
export async function listActiveOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { restaurantId: req.user!.restaurantId, bill: { status: "OPEN" } },
    orderBy: { createdAt: "desc" },
    include: {
      customerSession: { select: { name: true } },
      bill: { select: { table: { select: { id: true, label: true } } } },
      items: { include: { menuItem: { select: { name: true } } } },
    },
  });

  res.json({ orders: orders.map(serializeAdminOrder) });
}

/** PATCH /api/admin/orders/:id/status */
export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: string };
  const restaurantId = req.user!.restaurantId;

  const order = await prisma.order.findFirst({
    where: { id, restaurantId },
    select: { id: true, billId: true },
  });
  if (!order) {
    throw new ApiError(404, "Sipariş bulunamadı");
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: status as never },
    select: { id: true, status: true },
  });

  getIO()
    .to(billRoom(order.billId))
    .emit("order-status-changed", { orderId: updated.id, status: updated.status });
  getIO()
    .to(restaurantRoom(restaurantId))
    .emit("order-status-changed", { orderId: updated.id, status: updated.status });

  res.json({ order: updated });
}

/**
 * POST /api/admin/tables/:tableId/orders
 * Personelin, masadaki bir katılımcı ADINA sipariş girmesi — örn. müşteri
 * telefonunu kullanmadan sözlü sipariş verdiğinde. Sipariş yine mutlaka
 * gerçek bir CustomerSession'a bağlanır (kişisel hesap mantığı bozulmasın diye);
 * personel hangi katılımcı adına gireceğini seçer.
 */
export async function createOrderForTable(req: Request, res: Response) {
  const { tableId } = req.params as { tableId: string };
  const { customerSessionId, items } = req.body as {
    customerSessionId: string;
    items: OrderItemInput[];
  };
  const restaurantId = req.user!.restaurantId;

  const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  const bill = await prisma.bill.findFirst({ where: { tableId, status: "OPEN" } });
  if (!bill) {
    throw new ApiError(409, "Bu masada şu anda aktif bir hesap yok");
  }

  const session = await prisma.customerSession.findFirst({
    where: { id: customerSessionId, billId: bill.id },
  });
  if (!session) {
    throw new ApiError(400, "Geçersiz katılımcı — bu kişi bu masada değil");
  }

  const order = await createOrderForCustomerSession({
    restaurantId,
    billId: bill.id,
    customerSessionId,
    items,
  });

  res.status(201).json({ order });
}
