import { z } from "zod";

export const staffIdParamsSchema = z.object({ id: z.uuid() });

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "İsim boş olamaz").max(80),
  email: z.email({ message: "Geçerli bir e-posta girin" }),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["ADMIN", "STAFF"]),
});
