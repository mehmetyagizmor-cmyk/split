import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

/**
 * Express app'i burada, index.ts'ten AYRI olarak kuruyoruz — böylece
 * testler (bkz. tests/) gerçek bir sunucu dinletmeden (app.listen olmadan)
 * supertest ile doğrudan bu app'e istek atabiliyor. index.ts sadece bunu
 * alıp HTTP sunucusuna ve Socket.IO'ya bağlıyor.
 */
export const app = express();

app.use(helmet());
app.use(
  cors({
    // Cookie tabanlı auth kullandığımız için origin "*" olamaz — credentials:true
    // ile birlikte tarayıcı yalnızca açıkça izin verilen origin'e cookie gönderir.
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Public endpoint'ler (masa arama, menü vb.) hesap gerektirmediği için
// brute-force / scraping'i zorlaştırmak amacıyla genel bir rate limit uygulanıyor.
// Test ortamında kapalı — aksi halde tek bir test dosyası bile limiti aşıp
// testleri rastgele başarısız kılabilir (gerçek rate-limit davranışı zaten
// Phase 3/4'te elle doğrulandı).
if (process.env.NODE_ENV !== "test") {
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "split-backend" });
});

app.use("/api", apiRouter);

// Error handler her zaman EN SONDA tanımlanır — Express'in üstteki
// route'lardan next(err) ile gelen hataları buraya yönlendirmesi için.
app.use(errorHandler);
