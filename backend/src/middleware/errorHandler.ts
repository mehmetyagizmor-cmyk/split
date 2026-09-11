import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/errors";

/**
 * Tüm route'lardan sonra tek yerde tanımlanan hata yakalayıcı.
 * Beklenen hata tiplerini (ApiError, ZodError, bilinen Prisma hataları)
 * anlamlı HTTP status kodlarına çevirir; bilinmeyen her şey 500 döner ve
 * sunucu tarafında loglanır (stack trace asla client'a sızmaz).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Geçersiz istek verisi",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: "Record to update/delete does not exist"
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Kayıt bulunamadı" });
    }
    // P2002: unique constraint ihlali
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Bu kayıt zaten mevcut" });
    }
  }

  console.error("Beklenmeyen hata:", err);
  return res.status(500).json({ error: "Sunucu hatası" });
}
