import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// Basit health check endpoint — sunucunun ayakta olduğunu doğrulamak için.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "split-backend" });
});

app.listen(PORT, () => {
  console.log(`✅ Backend çalışıyor: http://localhost:${PORT}`);
});
