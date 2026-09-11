import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireCustomerSession } from "../middleware/customerAuth";
import {
  createOrderSchema,
  orderItemParamsSchema,
  shareOrderItemSchema,
} from "../schemas/order.schemas";
import {
  createOrder,
  getMyOrders,
  getBillOrders,
  shareOrderItem,
} from "../controllers/orders.controller";

export const ordersRouter = Router();

// Bu router'daki her route bir müşteri oturumu gerektirir.
ordersRouter.use(requireCustomerSession);

ordersRouter.post(
  "/",
  validate({ body: createOrderSchema }),
  asyncHandler(createOrder),
);

ordersRouter.get("/my", asyncHandler(getMyOrders));
ordersRouter.get("/bill", asyncHandler(getBillOrders));

ordersRouter.post(
  "/items/:orderItemId/share",
  validate({ params: orderItemParamsSchema, body: shareOrderItemSchema }),
  asyncHandler(shareOrderItem),
);
