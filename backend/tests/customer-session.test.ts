import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { createTestRestaurant, createTestTable, joinTable, cleanupRestaurant } from "./helpers";

describe("Müşteri masaya katılma ve oturum (senaryo 1, 2, 3)", () => {
  let restaurantId: string;
  let tableToken: string;

  beforeAll(async () => {
    const restaurant = await createTestRestaurant();
    restaurantId = restaurant.id;
    const table = await createTestTable(restaurantId);
    tableToken = table.token;
  });

  afterAll(async () => {
    await cleanupRestaurant(restaurantId);
  });

  it("1) bir müşteri QR token'ı ile masaya katılabiliyor", async () => {
    const res = await request(app).post(`/api/tables/${tableToken}/join`).send({ name: "Ali" });

    expect(res.status).toBe(201);
    expect(res.body.customerSession.name).toBe("Ali");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/customer_token=/);
  });

  it("2) katılım sonrası aynı customer session cookie ile /customer/me çalışıyor", async () => {
    const { cookie, customerSession } = await joinTable(tableToken, "Veli");

    const meRes = await request(app).get("/api/customer/me").set("Cookie", cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.customerSession.customerSessionId).toBe(customerSession.id);
    expect(meRes.body.customerSession.name).toBe("Veli");
  });

  it("cookie olmadan /customer/me 401 dönüyor", async () => {
    const res = await request(app).get("/api/customer/me");
    expect(res.status).toBe(401);
  });

  it("3) iki farklı müşteri aynı masaya katılabiliyor ve ikisi de lobide görünüyor", async () => {
    await joinTable(tableToken, "Kişi Bir");
    await joinTable(tableToken, "Kişi İki");

    const lobbyRes = await request(app).get(`/api/tables/${tableToken}/lobby`);
    const names = lobbyRes.body.participants.map((p: { name: string }) => p.name);

    expect(names).toContain("Kişi Bir");
    expect(names).toContain("Kişi İki");
  });
});
