import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { loginSchema } from "../schemas/auth.schemas";
import { login, logout, me } from "../controllers/auth.controller";

export const authRouter = Router();

// Genel /api limitinden (100/dk) ayrı, login'e özel daha sıkı bir sınır —
// şifre brute-force denemelerini yavaşlatmak için.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla giriş denemesi, lütfen daha sonra tekrar deneyin" },
});

authRouter.post(
  "/login",
  loginRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(login),
);
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
