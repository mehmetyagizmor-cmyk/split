import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { signCustomerToken } from "../lib/customerToken";
import { CUSTOMER_COOKIE_NAME } from "../middleware/customerAuth";
import { sumLineItems } from "../lib/money";

const CUSTOMER_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // customerToken'ın expiresIn'iyle aynı

/**
 * GET /api/tables/:token
 * QR koddan gelen bir müşterinin ilk isteği — masanın var olup olmadığını
 * ve hangi restorana ait olduğunu döner. Kasıtlı olarak restaurantId gibi
 * iç kimlikleri değil, sadece müşteriye gösterilecek kadarını döndürüyoruz.
 */
export async function getTableByToken(req: Request, res: Response) {
  // `validate` middleware bunun geçerli bir UUID string olduğunu garanti eder.
  const token = req.params.token as string;

  const table = await prisma.table.findUnique({
    where: { token },
    select: {
      id: true,
      label: true,
      status: true,
      restaurant: { select: { name: true } },
    },
  });

  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  res.json({ table });
}

/**
 * GET /api/tables/:token/menu
 * Masanın bağlı olduğu restoranın menüsünü (sadece satışta olan ürünler)
 * kategori sırasına göre döner.
 */
export async function getTableMenu(req: Request, res: Response) {
  // `validate` middleware bunun geçerli bir UUID string olduğunu garanti eder.
  const token = req.params.token as string;

  const table = await prisma.table.findUnique({
    where: { token },
    select: { restaurantId: true },
  });

  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: table.restaurantId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      menuItems: {
        where: { isAvailable: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true, price: true },
      },
    },
  });

  res.json({ categories });
}

/**
 * POST /api/tables/:token/join
 * Müşteri isim girip masaya katılır — hesap/şifre yok. Masanın o anki
 * "Bill"i (tek oturuşluk hesabı) yoksa oluşturulur, varsa ona katılınır.
 *
 * BİLİNEN SINIRLAMA: iki müşteri tam olarak aynı anda (aynı milisaniyede)
 * ilk kez bu masaya katılmaya çalışırsa, teorik olarak iki ayrı Bill
 * oluşabilir (race condition). Bunu DB seviyesinde tamamen engellemek
 * (örn. "tabloda bir tek OPEN bill olabilir" kısıtı) partial/filtered
 * unique index gerektirir — MVP için pratikte imkansıza yakın bu senaryoyu
 * çözmek, kazanımına göre gereksiz karmaşıklık olurdu. Gerçekleşirse
 * personel masayı manuel düzeltebilir.
 */
export async function joinTable(req: Request, res: Response) {
  const token = req.params.token as string;
  const { name } = req.body as { name: string };

  const table = await prisma.table.findUnique({ where: { token } });
  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  if (table.status === "CLOSED") {
    throw new ApiError(
      409,
      "Bu masa şu anda kapalı, lütfen personelden yardım isteyin",
    );
  }

  const { customerSession, bill } = await prisma.$transaction(async (tx) => {
    let activeBill = await tx.bill.findFirst({
      where: { tableId: table.id, status: "OPEN" },
    });

    if (!activeBill) {
      activeBill = await tx.bill.create({
        data: { tableId: table.id, restaurantId: table.restaurantId },
      });
      await tx.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    const newCustomerSession = await tx.customerSession.create({
      data: {
        billId: activeBill.id,
        restaurantId: table.restaurantId,
        name,
      },
    });

    return { customerSession: newCustomerSession, bill: activeBill };
  });

  const customerToken = signCustomerToken({
    customerSessionId: customerSession.id,
    billId: bill.id,
    tableId: table.id,
    restaurantId: table.restaurantId,
  });

  res.cookie(CUSTOMER_COOKIE_NAME, customerToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CUSTOMER_COOKIE_MAX_AGE_MS,
  });

  res.status(201).json({
    customerSession: { id: customerSession.id, name: customerSession.name },
    table: { id: table.id, label: table.label },
  });
}

/**
 * GET /api/tables/:token/lobby
 * Masadaki (o anki açık Bill'e katılmış) kişileri ve şu ana kadarki
 * toplam tutarı döner. Henüz sipariş sistemi (Phase 8) olmadığı için
 * toplam her zaman ₺0 çıkacak — bu bir eksiklik değil, doğru sonuç.
 */
export async function getLobby(req: Request, res: Response) {
  const token = req.params.token as string;

  const table = await prisma.table.findUnique({
    where: { token },
    select: { id: true, label: true, status: true },
  });
  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  const bill = await prisma.bill.findFirst({
    where: { tableId: table.id, status: "OPEN" },
    select: { id: true },
  });

  if (!bill) {
    return res.json({
      table: { label: table.label, status: table.status },
      participants: [],
      total: "0.00",
    });
  }

  const [participants, orders] = await Promise.all([
    prisma.customerSession.findMany({
      where: { billId: bill.id },
      orderBy: { joinedAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.order.findMany({
      where: { billId: bill.id, status: { not: "CANCELLED" } },
      select: { items: { select: { quantity: true, unitPrice: true } } },
    }),
  ]);

  const total = sumLineItems(orders.flatMap((order) => order.items));

  res.json({
    table: { label: table.label, status: table.status },
    participants,
    total: total.toFixed(2),
  });
}
