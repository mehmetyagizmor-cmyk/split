import { Router } from "express";
import { requireCustomerSession } from "../middleware/customerAuth";
import { getCustomerMe } from "../controllers/customerSession.controller";

export const customerSessionRouter = Router();

// getCustomerMe senkron (req.customerSession'ı doğrudan döndürüyor), asyncHandler'a
// gerek yok — asenkron doğrulama zaten requireCustomerSession içinde yapılıyor.
customerSessionRouter.get("/me", requireCustomerSession, getCustomerMe);
