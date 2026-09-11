import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Geçerli bir e-posta girin" }),
  password: z.string().min(1, "Şifre gerekli"),
});
