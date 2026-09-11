import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  menuCategoryIdParamsSchema,
  menuItemIdParamsSchema,
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from "../schemas/adminMenu.schemas";
import {
  getMenu,
  getFullMenu,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/adminMenu.controller";

export const adminMenuRouter = Router();

adminMenuRouter.use(requireAuth, requireRole("ADMIN", "STAFF"));

// Menüyü GÖRMEK hem staff hem admin'e açık (staff sipariş girerken kullanıyor).
adminMenuRouter.get("/", asyncHandler(getMenu));
adminMenuRouter.get("/full", asyncHandler(getFullMenu));

// Menüde DEĞİŞİKLİK yapmak sadece ADMIN'e açık.
adminMenuRouter.post(
  "/categories",
  requireRole("ADMIN"),
  validate({ body: createMenuCategorySchema }),
  asyncHandler(createMenuCategory),
);
adminMenuRouter.patch(
  "/categories/:id",
  requireRole("ADMIN"),
  validate({ params: menuCategoryIdParamsSchema, body: updateMenuCategorySchema }),
  asyncHandler(updateMenuCategory),
);
adminMenuRouter.delete(
  "/categories/:id",
  requireRole("ADMIN"),
  validate({ params: menuCategoryIdParamsSchema }),
  asyncHandler(deleteMenuCategory),
);

adminMenuRouter.post(
  "/items",
  requireRole("ADMIN"),
  validate({ body: createMenuItemSchema }),
  asyncHandler(createMenuItem),
);
adminMenuRouter.patch(
  "/items/:id",
  requireRole("ADMIN"),
  validate({ params: menuItemIdParamsSchema, body: updateMenuItemSchema }),
  asyncHandler(updateMenuItem),
);
adminMenuRouter.delete(
  "/items/:id",
  requireRole("ADMIN"),
  validate({ params: menuItemIdParamsSchema }),
  asyncHandler(deleteMenuItem),
);
