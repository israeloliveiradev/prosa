import { z } from "zod";
import { TARGET_LANGS } from "../types/database.js";

export const dossierQuerySchema = z.object({
  target_lang: z.enum(TARGET_LANGS),
});

export const dossierCheckpointSchema = z.object({
  target_lang: z.enum(TARGET_LANGS),
  focus: z.string().trim().min(2).max(80),
  note: z.string().trim().max(240).default(""),
  due_on: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const dossierCheckpointIdSchema = z.object({
  id: z.string().uuid(),
});

export const dossierTokenSchema = z.object({
  token: z.string().trim().min(8).max(48),
});
