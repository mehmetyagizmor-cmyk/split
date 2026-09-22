import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  createTestRestaurant,
  createTestTable,
  createTestMenuItem,
  joinTable,
  cleanupRestaurant,
} from "./helpers";

describe("Sipariş sistemi — doğru müşteriye bağlanma (senaryo 4)", () => {
  let restaurantId: string;
  let tableToken: string;
  let menuItemId: string;

  beforeAll(async () => {
    const restaurant = await createTestRestaurant();
    restaurantId = restaurant.id;
    const table = await createTestTable(restaurantId);
    tableToken = table.token;
    const menuItem = await createTestMenuItem(restaurantId, "100.00");
    menuItemId = menuItem.id;
  });

  afterAll(async () => {
    await cleanupRestaurant(restaurantId);
  });

  it("sipariş, siparişi veren müşteri oturumuna bağlanıyor", async () => {
    const { cookie } = await joinTable(tableToken, "Ayşe");

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ items: [{ menuItemId, quantity: 2 }] });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.order.items[0].quantity).toBe(2);
    expect(orderRes.body.order.total).toBe("200.00");

    const myOrdersRes = await request(app).get("/api/orders/my").set("Cookie", cookie);
    expect(myOrdersRes.body.orders).toHaveLength(1);

    // Ödeme-önce-sipariş: sipariş oluşurken o siparişe bağlı, PAID bir
    // Payment kaydı da otomatik oluşmuş olmalı.
    const payment = await prisma.payment.findFirst({
      where: { orderId: orderRes.body.order.id },
    });
    expect(payment?.status).toBe("PAID");
    expect(payment?.itemsAmount.toFixed(2)).toBe("200.00");
  });

  it("başka bir müşteri bu siparişi KENDİ /orders/my listesinde göremiyor", async () => {
    const { cookie } = await joinTable(tableToken, "Fatma");

    const ordersRes = await request(app).get("/api/orders/my").set("Cookie", cookie);
    expect(ordersRes.body.orders).toHaveLength(0);
  });

  it("var olmayan/satışta olmayan bir ürün sipariş edilemiyor", async () => {
    const { cookie } = await joinTable(tableToken, "Mehmet");

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ items: [{ menuItemId: "00000000-0000-4000-8000-000000000000", quantity: 1 }] });

    expect(res.status).toBe(400);
  });
});
