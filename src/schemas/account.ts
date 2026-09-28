import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth.js";
import { JOURNAL_MINDS, MEMORY_MINDS, READING_MINDS, SPEECH_MINDS } from "../services/minds.js";

const readingMindSchema = z.enum(READING_MINDS);
const memoryMindSchema = z.enum(MEMORY_MINDS);
const speechMindSchema = z.enum(SPEECH_MINDS);
const journalMindSchema = z.enum(JOURNAL_MINDS);

export const displayLocaleSchema = z.enum(["pt", "en"]);
export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);

export const forgotBodySchema = z.object({
  email: emailSchema,
});

export const verifyBodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

export const resetBodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  password: passwordSchema,
});

export const changePasswordBodySchema = z.object({
  current_password: passwordSchema,
  password: passwordSchema,
});

export const changeEmailBodySchema = z.object({
  password: passwordSchema,
  email: emailSchema,
});

export const confirmCodeBodySchema = z.object({
  code: otpCodeSchema,
});

export const secondFactorBodySchema = z.object({
  ticket: z.string().trim().min(20).max(200),
  code: z.string().trim().min(6).max(32),
});

export const totpConfirmBodySchema = z.object({
  code: otpCodeSchema,
});

export const disableFactorBodySchema = z.object({
  password: passwordSchema,
  code: z.string().trim().min(6).max(32),
});

export const passwordOnlyBodySchema = z.object({
  password: passwordSchema,
});

export const accountSettingsBodySchema = z
  .object({
    display_name: z.string().trim().min(2).max(40).nullable().optional(),
    display_locale: displayLocaleSchema.optional(),
    reminder_enabled: z.boolean().optional(),
    reminder_hour: z.number().int().min(0).max(23).optional(),
    mind_reading: readingMindSchema.optional(),
    mind_memory: memoryMindSchema.optional(),
    mind_speech: speechMindSchema.optional(),
    mind_journal: journalMindSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Empty patch" });

export type AccountSettingsBody = z.infer<typeof accountSettingsBodySchema>;
