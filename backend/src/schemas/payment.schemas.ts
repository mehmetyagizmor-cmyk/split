import { z } from "zod";

// Para her zaman string olarak alınır (örn. "50.00") — JS number ile ondalık
// para değeri taşımak, kaynağında bile float riski taşır.
export const createPaymentSchema = z.object({
  tipAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Geçersiz bahşiş tutarı")
    .default("0.00"),
});
