import { z } from "zod";

export const personaTurnBodySchema = z.object({
  scene_id: z.string().regex(/^[a-z0-9-]{3,48}$/),
  user_line: z.string().trim().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["persona", "learner"]),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .max(12),
});

export const personaReplySchema = z.object({
  reply: z.string().trim().min(1).max(600),
  tone: z.enum(["adequate", "direct", "informal", "inadequate"]),
  cultural_note: z.string().trim().min(8).max(400),
});

export type PersonaTurnBody = z.infer<typeof personaTurnBodySchema>;
export type PersonaReply = z.infer<typeof personaReplySchema>;
