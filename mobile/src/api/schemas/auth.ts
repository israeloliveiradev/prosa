import { z } from "zod";

/** Idiomas de interface que a conta guarda (`users.display_locale`, backend migração 032). */
export const ACCOUNT_LOCALES = ["pt", "en", "de", "fr", "es", "it", "ja"] as const;
export const AccountLocaleSchema = z.enum(ACCOUNT_LOCALES);

/** Objetivos do primeiro dia guardados na conta (`users.goal`). */
export const ACCOUNT_GOALS = ["career", "travel", "studies", "culture", "family", "relocation"] as const;
export const AccountGoalSchema = z.enum(ACCOUNT_GOALS);
export type AccountGoal = z.infer<typeof AccountGoalSchema>;

/** Meta diária guardada na conta (`users.daily_minutes`): 10, 20 ou 30. */
export const AccountMinutesSchema = z.union([z.literal(10), z.literal(20), z.literal(30)]);
export type AccountMinutes = z.infer<typeof AccountMinutesSchema>;

export const AccountUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    native_lang: z.string().optional(),
    through_lang: z.string().optional(),
    target_lang: z.string().optional().default("en"),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional().default("B1"),
    plan: z.enum(["free", "pro"]).optional().default("free"),
    role: z.enum(["learner", "admin"]).optional(),
    interests: z.array(z.string()).optional(),
    streak_count: z.number().optional(),
    streak_freeze_count: z.number().optional(),
    last_lesson_at: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    // Idioma de interface guardado na conta. Um valor desconhecido não derruba a sessão.
    display_locale: AccountLocaleSchema.optional().catch(undefined),
    // Objetivo e meta diária da conta (M2). Servidor antigo não manda; valor estranho vira "sem valor".
    goal: AccountGoalSchema.nullable().optional().catch(undefined),
    goal_note: z.string().nullable().optional().catch(undefined),
    daily_minutes: AccountMinutesSchema.optional().catch(undefined),
    reminder_enabled: z.boolean().optional(),
    reminder_hour: z.number().optional(),
    totp_enabled: z.boolean().optional(),
    email_2fa: z.boolean().optional(),
    mind_reading: z.string().optional(),
    mind_memory: z.string().optional(),
    mind_speech: z.string().optional(),
    mind_journal: z.string().optional(),
  })
  .transform((user) => ({
    ...user,
    native_lang: user.native_lang || user.through_lang || "pt",
    display_name: user.display_name || user.name || null,
  }));

export type AccountUser = z.infer<typeof AccountUserSchema>;

export const AccountSettingsSchema = z.object({
  display_name: z.string().nullable(),
  display_locale: AccountLocaleSchema,
  reminder_enabled: z.boolean(),
  reminder_hour: z.number(),
  totp_enabled: z.boolean(),
  email_2fa: z.boolean(),
  mind_reading: z.string(),
  mind_memory: z.string(),
  mind_speech: z.string(),
  mind_journal: z.string(),
  mail_configured: z.boolean(),
  mail_inbox_url: z.string().nullable(),
  // M2: opcionais para tolerar um servidor ainda sem a migração 032.
  goal: AccountGoalSchema.nullable().optional(),
  goal_note: z.string().nullable().optional(),
  daily_minutes: AccountMinutesSchema.optional(),
});

export type AccountSettings = z.infer<typeof AccountSettingsSchema>;

export const LoginChallengeSchema = z.object({
  requires_2fa: z.literal(true),
  ticket: z.string(),
  methods: z.array(z.enum(["totp", "email"])),
});

export type LoginChallenge = z.infer<typeof LoginChallengeSchema>;

export const VerifyChallengeSchema = z.object({
  requires_verify: z.literal(true),
  email: z.string(),
});

export type VerifyChallenge = z.infer<typeof VerifyChallengeSchema>;

export const AuthSessionResponseSchema = z.object({
  token: z.string(),
  user: AccountUserSchema,
});

export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;

export const LoginResponseSchema = z.union([
  AuthSessionResponseSchema,
  LoginChallengeSchema,
  VerifyChallengeSchema,
]);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RegisterResponseSchema = z.union([
  AuthSessionResponseSchema,
  VerifyChallengeSchema,
]);

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const CurrentAccountResponseSchema = z.object({
  user: AccountUserSchema,
});

export const MailInboxResponseSchema = z.object({
  inbox_url: z.string().nullable().optional(),
});
