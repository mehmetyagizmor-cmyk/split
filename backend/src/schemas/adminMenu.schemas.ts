import { z } from "zod";

const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Geçersiz fiyat");

export const menuCategoryIdParamsSchema = z.object({ id: z.uuid() });
export const menuItemIdParamsSchema = z.object({ id: z.uuid() });

export const createMenuCategorySchema = z.object({
  name: z.string().trim().min(1, "Kategori adı boş olamaz").max(50),
  sortOrder: z.number().int().default(0),
});

export const updateMenuCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  sortOrder: z.number().int().optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(1, "Ürün adı boş olamaz").max(80),
  description: z.string().trim().max(300).optional(),
  price: decimalString,
  isAvailable: z.boolean().default(true),
});

export const updateMenuItemSchema = z.object({
  categoryId: z.uuid().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  price: decimalString.optional(),
  isAvailable: z.boolean().optional(),
});
