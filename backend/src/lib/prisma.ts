import { PrismaClient } from "@prisma/client";

/**
 * Uygulama boyunca tek bir PrismaClient instance'ı kullanılır.
 * `tsx watch` her dosya değişikliğinde modülleri yeniden yüklediği için
 * dev modunda global'e asılıyoruz — aksi halde her hot-reload'da yeni bir
 * connection pool açılıp eskisi sızdırılır (Prisma'nın resmi önerisi budur).
 */
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
