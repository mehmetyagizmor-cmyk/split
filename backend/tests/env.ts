// Bu dosyanın TEK işi .env'i yüklemek — ayrı bir dosyada olmasının sebebi:
// ESM'de import'lar dosyanın en üstüne "hoist" edilir, yani aynı dosyada
// `dotenv.config()`den SONRA yazılan bir import bile önce çalışabilir.
// setup.ts'in kendi import'ları (socket.ts -> jwtSecret.ts zinciri) process.env'i
// okuduğu için, dotenv.config()'in bambaşka, önce yüklenen bu dosyada
// çalışması gerekiyor.
import dotenv from "dotenv";
dotenv.config();
