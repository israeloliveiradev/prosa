import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.string(),
  schema: z.string().optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
