import { z } from "zod";

export const adminPlanBodySchema = z.object({
  plan: z.enum(["free", "pro"]),
});

export const adminFreezeBodySchema = z.object({
  delta: z.union([z.literal(-1), z.literal(1)]),
});

export const adminGenerationBodySchema = z.object({
  paused: z.boolean(),
});

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  plan: z.enum(["free", "pro"]).optional(),
  role: z.enum(["learner", "admin"]).optional(),
});

export const adminEventsQuerySchema = z.object({
  kind: z.enum(["gemini", "lesson", "audio", "news", "billing"]).optional(),
  limit: z.coerce.number().int().min(1).max(80).optional(),
});

export type AdminPlanBody = z.infer<typeof adminPlanBodySchema>;
