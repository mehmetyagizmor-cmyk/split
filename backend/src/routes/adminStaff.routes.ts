import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { staffIdParamsSchema, createStaffSchema } from "../schemas/adminStaff.schemas";
import { listStaff, createStaff, deleteStaff } from "../controllers/adminStaff.controller";

export const adminStaffRouter = Router();

// Personel yönetimi tamamen ADMIN'e özel.
adminStaffRouter.use(requireAuth, requireRole("ADMIN"));

adminStaffRouter.get("/", asyncHandler(listStaff));
adminStaffRouter.post("/", validate({ body: createStaffSchema }), asyncHandler(createStaff));
adminStaffRouter.delete(
  "/:id",
  validate({ params: staffIdParamsSchema }),
  asyncHandler(deleteStaff),
);
