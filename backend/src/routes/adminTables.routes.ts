import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";
import {
  createTableSchema,
  tableIdParamsSchema,
} from "../schemas/table.schemas";
import { createOrderForTableSchema } from "../schemas/adminOrder.schemas";
import {
  listTables,
  createTable,
  regenerateTableToken,
  getTableQrCode,
  getTableDetail,
} from "../controllers/adminTables.controller";
import { createOrderForTable } from "../controllers/adminOrders.controller";

export const adminTablesRouter = Router();

// Bu router'daki HER route staff ya da admin girişi gerektirir.
adminTablesRouter.use(requireAuth, requireRole("ADMIN", "STAFF"));

adminTablesRouter.get("/", asyncHandler(listTables));

adminTablesRouter.post(
  "/",
  validate({ body: createTableSchema }),
  asyncHandler(createTable),
);

adminTablesRouter.get(
  "/:id",
  validate({ params: tableIdParamsSchema }),
  asyncHandler(getTableDetail),
);

adminTablesRouter.get(
  "/:id/qrcode",
  validate({ params: tableIdParamsSchema }),
  asyncHandler(getTableQrCode),
);

// Token yenileme daha riskli bir işlem (mevcut QR'ı geçersiz kılıyor) —
// üstteki requireRole("ADMIN","STAFF")'a EK olarak sadece ADMIN'e açıyoruz.
adminTablesRouter.post(
  "/:id/regenerate-token",
  requireRole("ADMIN"),
  validate({ params: tableIdParamsSchema }),
  asyncHandler(regenerateTableToken),
);

const tableIdPathParamSchema = z.object({ tableId: z.uuid() });

adminTablesRouter.post(
  "/:tableId/orders",
  validate({ params: tableIdPathParamSchema, body: createOrderForTableSchema }),
  asyncHandler(createOrderForTable),
);
