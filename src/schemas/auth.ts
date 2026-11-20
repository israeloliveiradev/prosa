import { z } from "zod";

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(8).max(72);

/** Idiomas de interface que a conta guarda (`users.display_locale`, migração 032). */
export const DISPLAY_LOCALES = ["pt", "en", "de", "fr", "es", "it", "ja"] as const;
export type DisplayLocale = (typeof DISPLAY_LOCALES)[number];
export const displayLocaleSchema = z.enum(DISPLAY_LOCALES);

const langSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,8}$/);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  native_lang: langSchema.default("pt"),
  target_lang: langSchema.default("en"),
  level: cefrLevelSchema.default("A2"),
  display_locale: displayLocaleSchema.optional(),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
