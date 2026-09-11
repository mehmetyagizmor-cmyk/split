import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken, type AuthTokenPayload } from "../lib/jwt";
import { ApiError } from "../lib/errors";

const COOKIE_NAME = "token";

/**
 * İstek cookie'sindeki JWT'yi doğrular ve req.user'a yazar.
 * Token yoksa veya geçersizse/süresi dolmuşsa 401 döner.
 * Bundan sonraki her middleware/controller req.user'ı güvenle okuyabilir.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    throw new ApiError(401, "Giriş yapmanız gerekiyor");
  }

  try {
    req.user = verifyAuthToken(token);
  } catch {
    throw new ApiError(401, "Oturum geçersiz veya süresi dolmuş");
  }

  next();
}

/**
 * requireAuth'tan SONRA kullanılır. Verilen rollerden birine sahip
 * olmayan kullanıcıyı 403 ile engeller — örn. requireRole("ADMIN").
 */
export function requireRole(...roles: AuthTokenPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "Bu işlem için yetkiniz yok");
    }
    next();
  };
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
