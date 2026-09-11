import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Public endpoint'ler (masa arama, menü vb.) hesap gerektirmediği için
// brute-force / scraping'i zorlaştırmak amacıyla genel bir rate limit uygulanıyor.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "split-backend" });
});

app.use("/api", apiRouter);

// Error handler her zaman EN SONDA tanımlanır — Express'in üstteki
// route'lardan next(err) ile gelen hataları buraya yönlendirmesi için.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend çalışıyor: http://localhost:${PORT}`);
});
