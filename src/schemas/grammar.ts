import { z } from "zod";
import { speakBodySchema } from "./speech.js";

export const GRAMMAR_ROLES = ["subject", "connector", "verb", "object"] as const;

export const grammarRoleSchema = z.enum(GRAMMAR_ROLES);

export const grammarBlockSchema = z.object({
  role: grammarRoleSchema,
  text: z.string().trim().min(1).max(160),
  options: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
});

export const grammarModelSchema = z.object({
  blocks: z.array(grammarBlockSchema).length(4),
});

export const grammarVaryModelSchema = z.object({
  sentence: z.string().trim().min(1).max(400),
  blocks: z.array(
    z.object({
      role: grammarRoleSchema,
      // O modelo devolve o conector vazio quando o tempo vai para a desinência ("sells");
      // GrammarService.vary repõe o bloco de entrada nesse caso.
      text: z.string().trim().max(160),
    }),
  ).length(4),
});

export const grammarRequestSchema = z.object({
  sentence: z.string().trim().min(1).max(500),
});

export const grammarVaryBodySchema = z.object({
  blocks: z.array(grammarBlockSchema).length(4),
  voice: speakBodySchema.shape.voice,
});

export type GrammarRole = z.infer<typeof grammarRoleSchema>;
export type GrammarBlock = z.infer<typeof grammarBlockSchema>;
