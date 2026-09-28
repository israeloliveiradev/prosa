import { z } from "zod";

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(8).max(72);
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
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
