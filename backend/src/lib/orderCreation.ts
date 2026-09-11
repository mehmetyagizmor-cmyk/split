import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./errors";
import { sumLineItems } from "./money";
import { getIO, billRoom, restaurantRoom } from "./socket";

export type OrderItemInput = { menuItemId: string; quantity: number };

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { menuItem: { select: { name: true } } } } };
}>;

export function serializeOrder(order: OrderWithItems) {
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
 * Bir sipariş oluşturmanın ortak mantığı — hem müşterinin kendi sepetini
 * onaylaması (POST /api/orders) hem de personelin bir müşteri adına sipariş
 * girmesi (POST /api/admin/tables/:id/orders, Phase 13) TAM OLARAK bu
 * fonksiyonu kullanır. Böylece doğrulama/fiyat-anlık-görüntüsü/canlı-yayın
 * mantığı iki yerde ayrı ayrı (ve birbirinden sapabilecek şekilde) yazılmıyor.
 */
export async function createOrderForCustomerSession(params: {
  restaurantId: string;
  billId: string;
  customerSessionId: string;
  items: OrderItemInput[];
}) {
  const { restaurantId, billId, customerSessionId, items } = params;

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];

  // Her ürünün GERÇEKTEN bu restorana ait ve hâlâ satışta olduğunu doğruluyoruz.
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
  getIO().to(billRoom(billId)).emit("order-created", serialized);
  getIO().to(restaurantRoom(restaurantId)).emit("order-created", serialized);

  return serialized;
}
