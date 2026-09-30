import { z } from "zod";
import { TARGET_LANGS } from "../types/database.js";
import { ORG_SECTORS } from "../services/org-sectors.js";

export const orgCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  sector: z.enum(ORG_SECTORS),
});

export const orgJoinSchema = z.object({
  code: z.string().trim().min(6).max(24),
});

export const orgTermSchema = z.object({
  target_lang: z.enum(TARGET_LANGS),
  phrase: z.string().trim().min(2).max(40),
  gloss: z.string().trim().max(80).default(""),
});
