import type { Request, Response } from "express";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { sumLineItems } from "../lib/money";

/**
 * Tüm fonksiyonlar requireAuth'tan sonra çalışır, req.user.restaurantId
 * dolu gelir. Her sorguyu restaurantId ile kısıtlamak, bir restoranın
 * başka bir restoranın masasını görmesini/değiştirmesini imkansız kılar —
 * "id doğru ama restaurantId farklı" durumunda kasıtlı olarak 404 dönülür,
 * "var ama senin değil" bilgisini bile sızdırmamak için.
 */

/** GET /api/admin/tables */
export async function listTables(req: Request, res: Response) {
  const tables = await prisma.table.findMany({
    where: { restaurantId: req.user!.restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, token: true, status: true, createdAt: true },
  });

  res.json({ tables });
}

/** POST /api/admin/tables */
export async function createTable(req: Request, res: Response) {
  const { label } = req.body as { label: string };

  const table = await prisma.table.create({
    data: { restaurantId: req.user!.restaurantId, label },
    select: { id: true, label: true, token: true, status: true, createdAt: true },
  });

  res.status(201).json({ table });
}

/**
 * GET /api/admin/tables/:id
 * Masa detayı: o anki açık Bill'i, katılımcıları (ve her birinin ödeyip
 * ödemediğini), ve tüm siparişleri döner. Personel panelinin "masaya tıkla,
 * hesabı ve siparişleri gör" ekranı burayı kullanır.
 */
export async function getTableDetail(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const restaurantId = req.user!.restaurantId;

  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
    select: { id: true, label: true, token: true, status: true },
  });
  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  const bill = await prisma.bill.findFirst({
    where: { tableId: id, status: "OPEN" },
    select: { id: true, openedAt: true },
  });

  if (!bill) {
    return res.json({ table, bill: null });
  }

  const [participants, payments, orders] = await Promise.all([
    prisma.customerSession.findMany({
      where: { billId: bill.id },
      orderBy: { joinedAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.payment.findMany({
      where: { billId: bill.id, status: "PAID" },
      select: { customerSessionId: true, totalAmount: true },
    }),
    prisma.order.findMany({
      where: { billId: bill.id, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      include: {
        customerSession: { select: { id: true, name: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    }),
  ]);

  const paidByCustomerSessionId = new Map(
    payments.map((p) => [p.customerSessionId, p.totalAmount.toFixed(2)]),
  );

  res.json({
    table,
    bill: {
      id: bill.id,
      openedAt: bill.openedAt,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        paymentStatus: paidByCustomerSessionId.has(p.id) ? "PAID" : "UNPAID",
        paidAmount: paidByCustomerSessionId.get(p.id) ?? null,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        customerName: order.customerSession.name,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: item.unitPrice.times(item.quantity).toFixed(2),
        })),
      })),
      grandTotal: sumLineItems(orders.flatMap((o) => o.items)).toFixed(2),
    },
  });
}

/** POST /api/admin/tables/:id/regenerate-token — sadece ADMIN (route'ta kısıtlanıyor) */
export async function regenerateTableToken(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const existing = await prisma.table.findFirst({
    where: { id, restaurantId: req.user!.restaurantId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  // Yeni rastgele token — crypto.randomUUID Node'un kendi API'si, ekstra
  // paket gerektirmiyor ve kriptografik olarak güvenli rastgelelik sağlıyor.
  const table = await prisma.table.update({
    where: { id },
    data: { token: crypto.randomUUID() },
    select: { id: true, label: true, token: true, status: true },
  });

  res.json({ table });
}

/** GET /api/admin/tables/:id/qrcode — /join/:token adresini kodlayan PNG döner */
export async function getTableQrCode(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const table = await prisma.table.findFirst({
    where: { id, restaurantId: req.user!.restaurantId },
    select: { token: true },
  });
  if (!table) {
    throw new ApiError(404, "Masa bulunamadı");
  }

  const joinUrl = `${process.env.FRONTEND_URL}/join/${table.token}`;
  const pngBuffer = await QRCode.toBuffer(joinUrl, {
    width: 400,
    margin: 2,
  });

  res.setHeader("Content-Type", "image/png");
  // Masa QR'ı staff panelinde sık sık yeniden istenebilir; token değişmediği
  // sürece tarayıcı bunu önbelleğe alabilir.
  res.setHeader("Cache-Control", "private, max-age=300");
  // helmet'in varsayılan "same-origin" CORP header'ı, frontend'in (farklı
  // porttaki) bir <img> etiketiyle bu görseli yüklemesini engelliyor —
  // fetch/XHR isteklerimiz CORS üzerinden geçtiği için bundan etkilenmiyor,
  // ama <img> öyle çalışmıyor. Sadece bu endpoint için gevşetiyoruz.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.send(pngBuffer);
}
