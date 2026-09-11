import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { updateSettingsSchema } from "../schemas/adminSettings.schemas";
import { getSettings, updateSettings } from "../controllers/adminSettings.controller";

export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAuth, requireRole("ADMIN"));

adminSettingsRouter.get("/", asyncHandler(getSettings));
adminSettingsRouter.patch(
  "/",
  validate({ body: updateSettingsSchema }),
  asyncHandler(updateSettings),
);
