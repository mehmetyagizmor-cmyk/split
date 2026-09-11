import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { tableTokenParamsSchema } from "../schemas/table.schemas";
import { getTableByToken, getTableMenu } from "../controllers/tables.controller";

export const tablesRouter = Router();

tablesRouter.get(
  "/:token",
  validate({ params: tableTokenParamsSchema }),
  asyncHandler(getTableByToken),
);

tablesRouter.get(
  "/:token/menu",
  validate({ params: tableTokenParamsSchema }),
  asyncHandler(getTableMenu),
);
