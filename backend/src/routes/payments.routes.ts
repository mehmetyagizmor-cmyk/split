import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireCustomerSession } from "../middleware/customerAuth";
import { createPaymentSchema } from "../schemas/payment.schemas";
import { createPayment } from "../controllers/payments.controller";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/",
  requireCustomerSession,
  validate({ body: createPaymentSchema }),
  asyncHandler(createPayment),
);
