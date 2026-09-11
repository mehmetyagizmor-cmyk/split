import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { hashPassword } from "../lib/password";

/** GET /api/admin/staff */
export async function listStaff(req: Request, res: Response) {
  const staff = await prisma.user.findMany({
    where: { restaurantId: req.user!.restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json({ staff });
}

/** POST /api/admin/staff */
export async function createStaff(req: Request, res: Response) {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "STAFF";
  };
  const restaurantId = req.user!.restaurantId;

  const existing = await prisma.user.findFirst({ where: { restaurantId, email } });
  if (existing) {
    throw new ApiError(409, "Bu e-posta ile zaten bir personel kaydı var");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { restaurantId, name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json({ staff: user });
}

/** DELETE /api/admin/staff/:id */
export async function deleteStaff(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const restaurantId = req.user!.restaurantId;

  if (id === req.user!.userId) {
    throw new ApiError(400, "Kendi hesabınızı silemezsiniz");
  }

  const target = await prisma.user.findFirst({ where: { id, restaurantId } });
  if (!target) {
    throw new ApiError(404, "Personel bulunamadı");
  }

  // Restoranın admin'siz kalmasını engelliyoruz — aksi halde kimse
  // yönetim paneline erişemeyen bir restoran ortaya çıkabilir.
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { restaurantId, role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ApiError(400, "Restoranın en az bir admin'i olmalı");
    }
  }

  await prisma.user.delete({ where: { id } });
  res.json({ success: true });
}
