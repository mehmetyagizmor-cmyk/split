import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

/**
 * Her test dosyası kendi izole restoranını oluşturur (Demo Cafe'ye
 * dokunmuyoruz) ve sonunda cleanupRestaurant ile tamamen siler — testler
 * paylaşılan gerçek Neon veritabanında çalıştığı için bu izolasyon şart.
 */
export async function createTestRestaurant(namePrefix = "Test Restoran") {
  return prisma.restaurant.create({
    data: { name: `${namePrefix} ${Date.now()}-${Math.random()}`, serviceFeePercent: "10.00" },
  });
}

export async function createTestUser(
  restaurantId: string,
  role: "ADMIN" | "STAFF" = "ADMIN",
  password = "test1234",
) {
  const passwordHash = await hashPassword(password);
  const email = `${role.toLowerCase()}-${Date.now()}-${Math.random()}@test.local`;
  const user = await prisma.user.create({
    data: { restaurantId, name: `Test ${role}`, email, passwordHash, role },
  });
  return { user, email, password };
}

export async function createTestTable(restaurantId: string, label = "Test Masa") {
  return prisma.table.create({ data: { restaurantId, label } });
}

export async function createTestMenuItem(
  restaurantId: string,
  price = "100.00",
  name = "Test Ürün",
) {
  const category = await prisma.menuCategory.create({
    data: { restaurantId, name: "Test Kategori" },
  });
  return prisma.menuItem.create({ data: { restaurantId, categoryId: category.id, name, price } });
}

/** Login isteği atar, dönen Set-Cookie header'ını (staff token) döner. */
export async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) {
    throw new Error(`Login başarısız: ${JSON.stringify(res.body)}`);
  }
  return cookie;
}

/** Bir masaya katılır, customer_token cookie'sini ve customerSession bilgisini döner. */
export async function joinTable(token: string, name: string) {
  const res = await request(app).post(`/api/tables/${token}/join`).send({ name });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) {
    throw new Error(`Masaya katılma başarısız: ${JSON.stringify(res.body)}`);
  }
  return { cookie, customerSession: res.body.customerSession as { id: string; name: string } };
}

/** Restoranı ve TÜM bağlı verisini siler — foreign key sırasına dikkat ederek. */
export async function cleanupRestaurant(restaurantId: string) {
  const bills = await prisma.bill.findMany({ where: { restaurantId } });
  for (const bill of bills) {
    await prisma.payment.deleteMany({ where: { billId: bill.id } });
    const orders = await prisma.order.findMany({ where: { billId: bill.id } });
    for (const order of orders) {
      const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of items) {
        await prisma.sharedItemParticipant.deleteMany({ where: { orderItemId: item.id } });
      }
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    }
    await prisma.order.deleteMany({ where: { billId: bill.id } });
    await prisma.customerSession.deleteMany({ where: { billId: bill.id } });
  }
  await prisma.bill.deleteMany({ where: { restaurantId } });
  await prisma.menuItem.deleteMany({ where: { restaurantId } });
  await prisma.menuCategory.deleteMany({ where: { restaurantId } });
  await prisma.table.deleteMany({ where: { restaurantId } });
  await prisma.user.deleteMany({ where: { restaurantId } });
  await prisma.restaurant.delete({ where: { id: restaurantId } });
}
