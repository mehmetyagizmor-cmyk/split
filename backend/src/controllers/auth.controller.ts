import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { comparePassword } from "../lib/password";
import { signAuthToken } from "../lib/jwt";
import { AUTH_COOKIE_NAME } from "../middleware/auth";

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 saat — JWT'nin expiresIn'iyle aynı

/**
 * POST /api/auth/login
 * NOT (MVP sınırlaması): email burada tüm restoranlar arasında aranıyor,
 * @@unique([restaurantId, email]) teorik olarak aynı email'in farklı
 * restoranlarda tekrarlanmasına izin veriyor. Gerçek bir SaaS'ta login
 * ekranına "hangi restoran" seçimi eklenebilir; MVP'de email'i pratikte
 * tekil kabul ediyoruz.
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findFirst({ where: { email } });

  // Kullanıcı bulunamadıysa da, şifre yanlışsa da AYNI mesajı dönüyoruz —
  // "bu email kayıtlı mı değil mi" bilgisini saldırgana sızdırmamak için.
  if (!user) {
    throw new ApiError(401, "E-posta veya şifre hatalı");
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "E-posta veya şifre hatalı");
  }

  const token = signAuthToken({
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
  });

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true, // JavaScript'ten erişilemez — XSS ile çalınamaz
    secure: process.env.NODE_ENV === "production", // prod'da sadece HTTPS
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    },
  });
}

/** POST /api/auth/logout */
export async function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
}

/** GET /api/auth/me — requireAuth'tan sonra çalışır, req.user dolu gelir. */
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true, restaurantId: true },
  });

  if (!user) {
    throw new ApiError(401, "Kullanıcı bulunamadı");
  }

  res.json({ user });
}
