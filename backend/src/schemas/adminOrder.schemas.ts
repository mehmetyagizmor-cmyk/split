import { z } from "zod";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
] as const;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const orderIdParamsSchema = z.object({
  id: z.uuid(),
});

export const createOrderForTableSchema = z.object({
  customerSessionId: z.uuid(),
  items: z
    .array(
      z.object({
        menuItemId: z.uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1, "En az bir ürün seçmelisiniz"),
});
