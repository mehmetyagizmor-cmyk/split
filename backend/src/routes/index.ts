import { Router } from "express";
import { tablesRouter } from "./tables.routes";

/**
 * Tüm API route'larının birleştiği yer. Yeni bir kaynak (orders, bills,
 * payments, admin...) eklendikçe burada bir satırla mount edilecek.
 */
export const apiRouter = Router();

apiRouter.use("/tables", tablesRouter);
