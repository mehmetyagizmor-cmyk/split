import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1, "En az bir ürün seçmelisiniz"),
});
