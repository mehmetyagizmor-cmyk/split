import type { Request, Response } from "express";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

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
  res.send(pngBuffer);
}
