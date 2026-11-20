import { z } from "zod";
import { displayLocaleSchema, emailSchema, passwordSchema } from "./auth.js";
import { normalizeOtp } from "../services/codes.js";
import { JOURNAL_MINDS, MEMORY_MINDS, READING_MINDS, SPEECH_MINDS } from "../services/minds.js";

const readingMindSchema = z.enum(READING_MINDS);
const memoryMindSchema = z.enum(MEMORY_MINDS);
const speechMindSchema = z.enum(SPEECH_MINDS);
const journalMindSchema = z.enum(JOURNAL_MINDS);

export { displayLocaleSchema };

/** Objetivos do primeiro dia (`users.goal`, migração 032). */
export const ACCOUNT_GOALS = ["career", "travel", "studies", "culture", "family", "relocation"] as const;
export type AccountGoal = (typeof ACCOUNT_GOALS)[number];
export const accountGoalSchema = z.enum(ACCOUNT_GOALS);

/** Meta diária em minutos (`users.daily_minutes`): a sessão central tem 20. */
export const DAILY_MINUTES = [10, 20, 30] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];
export const dailyMinutesSchema = z.union([z.literal(10), z.literal(20), z.literal(30)]);

/** Texto livre do objetivo: vazio vira null (apaga). */
export const goalNoteSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable();

export const otpCodeSchema = z
  .string()
  .transform(normalizeOtp)
  .pipe(z.string().regex(/^\d{6}$/));

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
    /** null apaga o objetivo. */
    goal: accountGoalSchema.nullable().optional(),
    /** null ou "" apaga a nota. */
    goal_note: goalNoteSchema.optional(),
    daily_minutes: dailyMinutesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Empty patch" });

export type AccountSettingsBody = z.infer<typeof accountSettingsBodySchema>;
