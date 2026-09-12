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

  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true, // JavaScript'ten erişilemez — XSS ile çalınamaz
    secure: isProduction, // prod'da sadece HTTPS
    // Geliştirmede frontend (5173) ve backend (4000) aynı "site" (localhost),
    // sadece port farklı — SameSite=Lax yeterli. Production'da ise frontend
    // (vercel.app) ve backend (onrender.com) GERÇEKTEN farklı domain'ler
    // olacak; SameSite=Lax bu durumda cookie'nin hiç gönderilmemesine
    // (yani oturumun tamamen çalışmamasına) yol açardı. SameSite=None,
    // tarayıcı kuralı gereği sadece Secure (HTTPS) ile birlikte kullanılabilir
    // — bu yüzden ikisini birlikte, sadece production'da açıyoruz.
    sameSite: isProduction ? "none" : "lax",
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
  // clearCookie'nin tarayıcıda gerçekten silinmesi için, cookie'yi
  // set ederken kullandığımız SameSite/Secure değerleriyle birebir
  // eşleşmesi gerekiyor — aksi halde bazı tarayıcılar cookie'yi silmez.
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
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
