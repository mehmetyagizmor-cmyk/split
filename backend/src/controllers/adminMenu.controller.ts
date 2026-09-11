import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

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

/**
 * GET /api/admin/menu/full
 * Menü yönetim ekranı için — satışta olmayan ürünler de dahil, tüm detaylarla.
 */
export async function getFullMenu(req: Request, res: Response) {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: req.user!.restaurantId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      menuItems: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          isAvailable: true,
        },
      },
    },
  });

  res.json({ categories });
}

/** POST /api/admin/menu-categories */
export async function createMenuCategory(req: Request, res: Response) {
  const { name, sortOrder } = req.body as { name: string; sortOrder: number };

  const category = await prisma.menuCategory.create({
    data: { restaurantId: req.user!.restaurantId, name, sortOrder },
  });

  res.status(201).json({ category });
}

/** PATCH /api/admin/menu-categories/:id */
export async function updateMenuCategory(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = req.body as { name?: string; sortOrder?: number };

  const existing = await prisma.menuCategory.findFirst({
    where: { id, restaurantId: req.user!.restaurantId },
  });
  if (!existing) {
    throw new ApiError(404, "Kategori bulunamadı");
  }

  const category = await prisma.menuCategory.update({ where: { id }, data });
  res.json({ category });
}

/** DELETE /api/admin/menu-categories/:id */
export async function deleteMenuCategory(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const existing = await prisma.menuCategory.findFirst({
    where: { id, restaurantId: req.user!.restaurantId },
  });
  if (!existing) {
    throw new ApiError(404, "Kategori bulunamadı");
  }

  const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
  if (itemCount > 0) {
    throw new ApiError(
      409,
      "Bu kategoride ürünler var — önce ürünleri silin ya da başka kategoriye taşıyın",
    );
  }

  await prisma.menuCategory.delete({ where: { id } });
  res.json({ success: true });
}

/** POST /api/admin/menu-items */
export async function createMenuItem(req: Request, res: Response) {
  const { categoryId, name, description, price, isAvailable } = req.body as {
    categoryId: string;
    name: string;
    description?: string;
    price: string;
    isAvailable: boolean;
  };
  const restaurantId = req.user!.restaurantId;

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId },
  });
  if (!category) {
    throw new ApiError(400, "Geçersiz kategori");
  }

  const item = await prisma.menuItem.create({
    data: { restaurantId, categoryId, name, description, price, isAvailable },
  });

  res.status(201).json({ item });
}

/** PATCH /api/admin/menu-items/:id */
export async function updateMenuItem(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const restaurantId = req.user!.restaurantId;
  const data = req.body as {
    categoryId?: string;
    name?: string;
    description?: string | null;
    price?: string;
    isAvailable?: boolean;
  };

  const existing = await prisma.menuItem.findFirst({ where: { id, restaurantId } });
  if (!existing) {
    throw new ApiError(404, "Ürün bulunamadı");
  }

  if (data.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId },
    });
    if (!category) {
      throw new ApiError(400, "Geçersiz kategori");
    }
  }

  const item = await prisma.menuItem.update({ where: { id }, data });
  res.json({ item });
}

/** DELETE /api/admin/menu-items/:id */
export async function deleteMenuItem(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const restaurantId = req.user!.restaurantId;

  const existing = await prisma.menuItem.findFirst({ where: { id, restaurantId } });
  if (!existing) {
    throw new ApiError(404, "Ürün bulunamadı");
  }

  // Bu ürün daha önce sipariş edildiyse silmek foreign key hatası verir —
  // geçmiş siparişlerin bütünlüğünü bozmamak için önce kontrol ediyoruz ve
  // kullanıcıya anlaşılır bir alternatif ("satıştan kaldır") öneriyoruz.
  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });
  if (orderItemCount > 0) {
    throw new ApiError(
      409,
      "Bu ürün geçmişte sipariş edilmiş, silinemez. Bunun yerine 'satışta değil' yapabilirsiniz.",
    );
  }

  await prisma.menuItem.delete({ where: { id } });
  res.json({ success: true });
}
