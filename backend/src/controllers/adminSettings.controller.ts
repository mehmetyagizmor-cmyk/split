import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/** GET /api/admin/settings */
export async function getSettings(req: Request, res: Response) {
  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: req.user!.restaurantId },
    select: { id: true, name: true, serviceFeePercent: true },
  });

  res.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      serviceFeePercent: restaurant.serviceFeePercent.toFixed(2),
    },
  });
}

/** PATCH /api/admin/settings */
export async function updateSettings(req: Request, res: Response) {
  const data = req.body as { name?: string; serviceFeePercent?: string };

  const restaurant = await prisma.restaurant.update({
    where: { id: req.user!.restaurantId },
    data,
    select: { id: true, name: true, serviceFeePercent: true },
  });

  res.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      serviceFeePercent: restaurant.serviceFeePercent.toFixed(2),
    },
  });
}
