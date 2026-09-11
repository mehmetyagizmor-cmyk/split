import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  createTestRestaurant,
  createTestTable,
  createTestUser,
  loginAs,
  cleanupRestaurant,
} from "./helpers";

describe("Tenant izolasyonu ve yetkilendirme (senaryo 9, 10)", () => {
  let restaurantAId: string;
  let restaurantBId: string;
  let tableAId: string;
  let adminACookie: string;
  let adminBCookie: string;
  let staffACookie: string;

  beforeAll(async () => {
    const restaurantA = await createTestRestaurant("Restoran A");
    const restaurantB = await createTestRestaurant("Restoran B");
    restaurantAId = restaurantA.id;
    restaurantBId = restaurantB.id;

    const tableA = await createTestTable(restaurantAId, "A Masası");
    tableAId = tableA.id;

    const { email: adminAEmail, password: adminAPass } = await createTestUser(restaurantAId, "ADMIN");
    const { email: adminBEmail, password: adminBPass } = await createTestUser(restaurantBId, "ADMIN");
    const { email: staffAEmail, password: staffAPass } = await createTestUser(restaurantAId, "STAFF");

    adminACookie = await loginAs(adminAEmail, adminAPass);
    adminBCookie = await loginAs(adminBEmail, adminBPass);
    staffACookie = await loginAs(staffAEmail, staffAPass);
  });

  afterAll(async () => {
    await cleanupRestaurant(restaurantAId);
    await cleanupRestaurant(restaurantBId);
  });

  it("9) Restoran B, Restoran A'nın masasını GÖREMİYOR (404, varlığı bile sızmıyor)", async () => {
    const res = await request(app).get(`/api/admin/tables/${tableAId}`).set("Cookie", adminBCookie);
    expect(res.status).toBe(404);
  });

  it("9) Restoran B, Restoran A'nın masa listesinde HİÇBİR ŞEY göremiyor", async () => {
    const res = await request(app).get("/api/admin/tables").set("Cookie", adminBCookie);
    expect(res.status).toBe(200);
    expect(res.body.tables.find((t: { id: string }) => t.id === tableAId)).toBeUndefined();
  });

  it("10) giriş yapılmadan admin endpoint'ine erişim engelleniyor", async () => {
    const res = await request(app).get("/api/admin/tables");
    expect(res.status).toBe(401);
  });

  it("10) geçersiz/sahte bir JWT ile korumalı endpoint reddediliyor", async () => {
    const res = await request(app).get("/api/customer/me").set("Cookie", "customer_token=not-a-real-jwt");
    expect(res.status).toBe(401);
  });

  it("10) STAFF, ADMIN-only bir işlemi yapamıyor (menü kategorisi oluşturma)", async () => {
    const res = await request(app)
      .post("/api/admin/menu/categories")
      .set("Cookie", staffACookie)
      .send({ name: "Yeni Kategori", sortOrder: 0 });
    expect(res.status).toBe(403);
  });

  it("10) STAFF, personel listesini göremiyor (ADMIN-only route)", async () => {
    const res = await request(app).get("/api/admin/staff").set("Cookie", staffACookie);
    expect(res.status).toBe(403);
  });
});
