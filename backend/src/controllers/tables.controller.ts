import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

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
