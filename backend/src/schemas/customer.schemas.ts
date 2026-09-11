import { z } from "zod";

export const joinTableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "İsim boş olamaz")
    .max(40, "İsim en fazla 40 karakter olabilir"),
});
