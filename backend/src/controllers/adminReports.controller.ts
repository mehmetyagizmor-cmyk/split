import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * GET /api/admin/reports?range=today|month
 * Basit satış özeti — ödemesi tamamlanmış (PAID) Payment kayıtları üzerinden
 * hesaplanır. Varsayılan "today".
 */
export async function getSalesReport(req: Request, res: Response) {
  const range = req.query.range === "month" ? "month" : "today";
  const restaurantId = req.user!.restaurantId;

  const now = new Date();
  const since =
    range === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth(), 1);

  const [payments, orderCount] = await Promise.all([
    prisma.payment.findMany({
      where: { restaurantId, status: "PAID", paidAt: { gte: since } },
      select: { totalAmount: true, tipAmount: true },
    }),
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
    }),
  ]);

  let totalRevenue = new Prisma.Decimal(0);
  let totalTips = new Prisma.Decimal(0);
  for (const payment of payments) {
    totalRevenue = totalRevenue.plus(payment.totalAmount);
    totalTips = totalTips.plus(payment.tipAmount);
  }

  res.json({
    range,
    since,
    totalRevenue: totalRevenue.toFixed(2),
    totalTips: totalTips.toFixed(2),
    paymentCount: payments.length,
    orderCount,
  });
}
