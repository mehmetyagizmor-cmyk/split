import { Router } from "express";
import { tablesRouter } from "./tables.routes";
import { authRouter } from "./auth.routes";
import { adminTablesRouter } from "./adminTables.routes";
import { customerSessionRouter } from "./customerSession.routes";
import { ordersRouter } from "./orders.routes";
import { paymentsRouter } from "./payments.routes";
import { adminOrdersRouter } from "./adminOrders.routes";
import { adminMenuRouter } from "./adminMenu.routes";
import { adminStaffRouter } from "./adminStaff.routes";
import { adminSettingsRouter } from "./adminSettings.routes";
import { adminReportsRouter } from "./adminReports.routes";

/**
 * Tüm API route'larının birleştiği yer. Yeni bir kaynak (orders, bills,
 * payments, admin...) eklendikçe burada bir satırla mount edilecek.
 */
export const apiRouter = Router();

apiRouter.use("/tables", tablesRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin/tables", adminTablesRouter);
apiRouter.use("/customer", customerSessionRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/admin/orders", adminOrdersRouter);
apiRouter.use("/admin/menu", adminMenuRouter);
apiRouter.use("/admin/staff", adminStaffRouter);
apiRouter.use("/admin/settings", adminSettingsRouter);
apiRouter.use("/admin/reports", adminReportsRouter);
