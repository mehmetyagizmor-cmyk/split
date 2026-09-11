import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { sumLineItems } from "../lib/money";

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

  res.status(201).json({ order: serializeOrder(order) });
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
