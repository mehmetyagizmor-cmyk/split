import { z } from "zod";

/**
 * QR kod URL'inden gelen token her zaman bir UUID formatında olmalı
 * (Table.token @default(uuid()) ile üretiliyor). Format burada erkenden
 * doğrulanınca, geçersiz bir string ile boşuna veritabanına gidilmiyor.
 */
export const tableTokenParamsSchema = z.object({
  token: z.uuid({ message: "Geçersiz masa token'ı" }),
});
