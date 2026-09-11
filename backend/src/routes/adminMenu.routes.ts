import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getMenu } from "../controllers/adminMenu.controller";

export const adminMenuRouter = Router();

adminMenuRouter.use(requireAuth, requireRole("ADMIN", "STAFF"));
adminMenuRouter.get("/", asyncHandler(getMenu));
