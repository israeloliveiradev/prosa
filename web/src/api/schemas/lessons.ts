import { z } from "zod";

export const CognateAnchorSchema = z.object({
  word: z.string(),
  familiar: z.string(),
  gloss: z.string(),
  kind: z.enum(["true", "false"]),
});

export type CognateAnchor = z.infer<typeof CognateAnchorSchema>;

export const CognatesResponseSchema = z.object({
  anchors: z.array(CognateAnchorSchema).optional().default([]),
});

export type CognatesResponse = z.infer<typeof CognatesResponseSchema>;
