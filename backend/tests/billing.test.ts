import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  createTestRestaurant,
  createTestTable,
  createTestMenuItem,
  joinTable,
  cleanupRestaurant,
} from "./helpers";

describe("Kişisel hesap hesaplama (senaryo 5)", () => {
  let restaurantId: string;
  let tableToken: string;
  let menuItemId: string;

  beforeAll(async () => {
    // serviceFeePercent createTestRestaurant içinde "10.00" olarak ayarlanıyor.
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

  it("kişisel ürünler + %10 servis ücreti doğru toplanıyor", async () => {
    const { cookie } = await joinTable(tableToken, "Zeynep");

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ items: [{ menuItemId, quantity: 2 }] }); // 2 x 100 = 200

    const billRes = await request(app).get("/api/customer/bill").set("Cookie", cookie);

    expect(billRes.body.personalSubtotal).toBe("200.00");
    expect(billRes.body.serviceFeeAmount).toBe("20.00"); // %10
    expect(billRes.body.amountDue).toBe("220.00");
  });

  it("başka bir müşterinin siparişi bu müşterinin hesabına karışmıyor", async () => {
    const { cookie: cookieA } = await joinTable(tableToken, "Kişi A");
    const { cookie: cookieB } = await joinTable(tableToken, "Kişi B");

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookieA)
      .send({ items: [{ menuItemId, quantity: 1 }] }); // sadece A sipariş verdi

    const billB = await request(app).get("/api/customer/bill").set("Cookie", cookieB);
    expect(billB.body.personalSubtotal).toBe("0.00");
  });
});

describe("Ortak ürün paylaşımı ve yuvarlama (senaryo 6)", () => {
  let restaurantId: string;
  let tableToken: string;
  let menuItemId: string;

  beforeAll(async () => {
    const restaurant = await createTestRestaurant();
    restaurantId = restaurant.id;
    const table = await createTestTable(restaurantId);
    tableToken = table.token;
    const menuItem = await createTestMenuItem(restaurantId, "200.00", "Patates Kızartması");
    menuItemId = menuItem.id;
  });

  afterAll(async () => {
    await cleanupRestaurant(restaurantId);
  });

  it("₺200'lük ürün 3 kişi arasında kuruşuna kadar eksiksiz bölünüyor", async () => {
    const p1 = await joinTable(tableToken, "Yağız");
    const p2 = await joinTable(tableToken, "Ahmet");
    const p3 = await joinTable(tableToken, "Mehmet");

    const orderRes = await request(app)
      .post("/api/orders")
      .set("Cookie", p1.cookie)
      .send({ items: [{ menuItemId, quantity: 1 }] });
    const orderItemId = orderRes.body.order.items[0].id;

    const shareRes = await request(app)
      .post(`/api/orders/items/${orderItemId}/share`)
      .set("Cookie", p1.cookie)
      .send({ customerSessionIds: [p1.customerSession.id, p2.customerSession.id, p3.customerSession.id] });
    expect(shareRes.status).toBe(200);

    const bills = await Promise.all(
      [p1, p2, p3].map((p) =>
        request(app).get("/api/customer/bill").set("Cookie", p.cookie).then((r) => r.body),
      ),
    );

    // Paylaşılan ürün artık kimsenin "kişisel" tutarında değil, sadece pay olarak görünmeli.
    for (const bill of bills) {
      expect(bill.personalSubtotal).toBe("0.00");
    }

    const shareAmounts = bills.map((b) => parseFloat(b.sharedSubtotal));
    const totalShared = shareAmounts.reduce((sum, v) => sum + v, 0);

    // Kayıp/fazla kuruş olmamalı — toplam tam 200.00 olmalı.
    expect(totalShared.toFixed(2)).toBe("200.00");
    // Her pay ~66.67 civarında olmalı (66.66 ya da 66.67).
    for (const amount of shareAmounts) {
      expect(amount).toBeGreaterThanOrEqual(66.66);
      expect(amount).toBeLessThanOrEqual(66.67);
    }
  });
});
