import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireCustomerSession } from "../middleware/customerAuth";
import { createOrderSchema } from "../schemas/order.schemas";
import { createOrder, getMyOrders } from "../controllers/orders.controller";

export const ordersRouter = Router();

// Bu router'daki her route bir müşteri oturumu gerektirir.
ordersRouter.use(requireCustomerSession);

ordersRouter.post(
  "/",
  validate({ body: createOrderSchema }),
  asyncHandler(createOrder),
);

ordersRouter.get("/my", asyncHandler(getMyOrders));
