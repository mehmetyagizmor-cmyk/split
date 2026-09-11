import { Router } from "express";
import { tablesRouter } from "./tables.routes";
import { authRouter } from "./auth.routes";
import { adminTablesRouter } from "./adminTables.routes";
import { customerSessionRouter } from "./customerSession.routes";

/**
 * Tüm API route'larının birleştiği yer. Yeni bir kaynak (orders, bills,
 * payments, admin...) eklendikçe burada bir satırla mount edilecek.
 */
export const apiRouter = Router();

apiRouter.use("/tables", tablesRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin/tables", adminTablesRouter);
apiRouter.use("/customer", customerSessionRouter);
