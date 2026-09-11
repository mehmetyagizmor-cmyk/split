import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { tableTokenParamsSchema } from "../schemas/table.schemas";
import { joinTableSchema } from "../schemas/customer.schemas";
import {
  getTableByToken,
  getTableMenu,
  joinTable,
  getLobby,
} from "../controllers/tables.controller";

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

tablesRouter.post(
  "/:token/join",
  validate({ params: tableTokenParamsSchema, body: joinTableSchema }),
  asyncHandler(joinTable),
);

tablesRouter.get(
  "/:token/lobby",
  validate({ params: tableTokenParamsSchema }),
  asyncHandler(getLobby),
);
