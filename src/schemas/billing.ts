import { z } from "zod";

const checkoutUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    if (url.username || url.password) {
      return false;
    }
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "prosa:";
  }, "Checkout URL must use http, https, or the prosa app scheme");

export const checkoutBodySchema = z.object({
  success_url: checkoutUrlSchema,
  cancel_url: checkoutUrlSchema,
});

export const checkoutSessionParamsSchema = z.object({
  id: z.string().regex(/^cs_[A-Za-z0-9_]+$/),
});
