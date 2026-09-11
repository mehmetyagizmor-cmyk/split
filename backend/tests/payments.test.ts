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

describe("Ödeme sistemi (senaryo 7, 8)", () => {
  let restaurantId: string;
  let menuItemId: string;

  beforeAll(async () => {
    const restaurant = await createTestRestaurant();
    restaurantId = restaurant.id;
    const menuItem = await createTestMenuItem(restaurantId, "100.00");
    menuItemId = menuItem.id;
  });

  afterAll(async () => {
    await cleanupRestaurant(restaurantId);
  });

  it("7) ödeme doğru customer session'a bağlanıyor ve tekrar ödemeye izin verilmiyor", async () => {
    // Her test kendi masasını kullanıyor — bir testte masa kapanırsa
    // diğerini etkilemesin diye. Masada BİLEREK ikinci bir kişi (Veli) var —
    // aksi halde Ali TEK katılımcı olurdu, ödemesi masayı hemen kapatırdı,
    // ve ikinci deneme "zaten ödedin" (409) yerine "oturum bitti" (401)
    // alırdı — bu da doğru ama farklı bir senaryoyu test etmiş olurdu.
    const table = await createTestTable(restaurantId, "Ödeme Testi Masası");
    const { cookie } = await joinTable(table.token, "Ali");
    await joinTable(table.token, "Veli");
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ items: [{ menuItemId, quantity: 1 }] });

    const payRes = await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send({ tipAmount: "0.00" });

    expect(payRes.status).toBe(201);
    expect(payRes.body.payment.status).toBe("PAID");
    expect(payRes.body.payment.totalAmount).toBe("110.00"); // 100 + %10 servis
    expect(payRes.body.billClosed).toBe(false); // Veli henüz ödemedi

    const secondAttempt = await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send({ tipAmount: "0.00" });
    expect(secondAttempt.status).toBe(409);
  });

  it("8) masadaki herkes ödemeden masa kapanmıyor, herkes ödeyince kapanıyor", async () => {
    const table = await createTestTable(restaurantId, "Kapama Testi Masası");
    const p1 = await joinTable(table.token, "Can");
    const p2 = await joinTable(table.token, "Cem");

    for (const p of [p1, p2]) {
      await request(app)
        .post("/api/orders")
        .set("Cookie", p.cookie)
        .send({ items: [{ menuItemId, quantity: 1 }] });
    }

    const pay1 = await request(app).post("/api/payments").set("Cookie", p1.cookie).send({ tipAmount: "0.00" });
    expect(pay1.body.billClosed).toBe(false);

    const pay2 = await request(app).post("/api/payments").set("Cookie", p2.cookie).send({ tipAmount: "0.00" });
    expect(pay2.body.billClosed).toBe(true);

    // Masa artık kapalı — yeni biri katılamamalı.
    const joinAttemptAfterClose = await request(app)
      .post(`/api/tables/${table.token}/join`)
      .send({ name: "Geç Kalan" });
    expect(joinAttemptAfterClose.status).toBe(409);
  });
});
