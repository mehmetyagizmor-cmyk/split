import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * GET /api/admin/menu
 * Personelin bir müşteri adına sipariş girerken ürün seçtiği liste — mantığı
 * müşteri tarafındaki GET /api/tables/:token/menu ile aynı, sadece token
 * yerine giriş yapmış personelin restaurantId'sini kullanıyor.
 */
export async function getMenu(req: Request, res: Response) {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: req.user!.restaurantId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      menuItems: {
        where: { isAvailable: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true },
      },
    },
  });

  res.json({ categories });
}
