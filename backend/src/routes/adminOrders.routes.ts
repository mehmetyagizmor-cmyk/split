import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  updateOrderStatusSchema,
  orderIdParamsSchema,
} from "../schemas/adminOrder.schemas";
import { listActiveOrders, updateOrderStatus } from "../controllers/adminOrders.controller";

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAuth, requireRole("ADMIN", "STAFF"));

adminOrdersRouter.get("/", asyncHandler(listActiveOrders));

adminOrdersRouter.patch(
  "/:id/status",
  validate({ params: orderIdParamsSchema, body: updateOrderStatusSchema }),
  asyncHandler(updateOrderStatus),
);
