import { z } from "zod";

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(1, "Restoran adı boş olamaz").max(100).optional(),
  serviceFeePercent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Geçersiz servis ücreti yüzdesi")
    .optional(),
});
