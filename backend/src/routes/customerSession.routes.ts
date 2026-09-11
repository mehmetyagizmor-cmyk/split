import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireCustomerSession } from "../middleware/customerAuth";
import { getCustomerMe } from "../controllers/customerSession.controller";
import { getMyBill } from "../controllers/customerBill.controller";

export const customerSessionRouter = Router();

customerSessionRouter.use(requireCustomerSession);

// getCustomerMe senkron (req.customerSession'ı doğrudan döndürüyor), asyncHandler'a gerek yok.
customerSessionRouter.get("/me", getCustomerMe);
customerSessionRouter.get("/bill", asyncHandler(getMyBill));
