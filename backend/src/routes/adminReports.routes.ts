import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getSalesReport } from "../controllers/adminReports.controller";

export const adminReportsRouter = Router();

adminReportsRouter.use(requireAuth, requireRole("ADMIN"));
adminReportsRouter.get("/", asyncHandler(getSalesReport));
