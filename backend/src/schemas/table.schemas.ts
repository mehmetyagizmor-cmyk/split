import { z } from "zod";

/**
 * QR kod URL'inden gelen token her zaman bir UUID formatında olmalı
 * (Table.token @default(uuid()) ile üretiliyor). Format burada erkenden
 * doğrulanınca, geçersiz bir string ile boşuna veritabanına gidilmiyor.
 */
export const tableTokenParamsSchema = z.object({
  token: z.uuid({ message: "Geçersiz masa token'ı" }),
});

/** Admin/staff route'larında masanın iç (veritabanı) id'sini doğrular. */
export const tableIdParamsSchema = z.object({
  id: z.uuid({ message: "Geçersiz masa id'si" }),
});

export const createTableSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Masa adı boş olamaz")
    .max(50, "Masa adı en fazla 50 karakter olabilir"),
});
