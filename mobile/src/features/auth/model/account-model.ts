import { ApiError, toUserMessage } from "@/api/errors";
import type { DisplayLocale } from "@/lib/i18n";

/**
 * Regras puras da tela de conta (validação, par de idiomas, desafios do login),
 * testadas em tests/unit/account-model.test.ts.
 */

/** Idiomas de estudo. Português é só idioma de apoio, nunca alvo. */
export const STUDY_TARGETS = ["en", "es", "de", "fr", "it", "ja", "ru"] as const;
/** Idiomas de apoio (explicações e traduções). */
export const SUPPORT_LANGS = ["pt", "en", "es", "de", "fr", "it", "ja", "ru"] as const;

export type StudyTarget = (typeof STUDY_TARGETS)[number];
export type SupportLang = (typeof SUPPORT_LANGS)[number];

export interface LanguagePair {
  target: string;
  support: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** O servidor aceita senhas de 8 a 72 caracteres. */
export function passwordAccepted(value: string): boolean {
  return value.length >= 8 && value.length <= 72;
}

export type PasswordStrength = "weak" | "ok" | "strong";

export function passwordStrengthOf(value: string): PasswordStrength {
  if (!passwordAccepted(value)) {
    return "weak";
  }
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  return value.length >= 12 && kinds >= 3 ? "strong" : "ok";
}

/** Só dígitos, no máximo 6 (código de e-mail, de redefinição e de cadastro). */
export function sixDigitCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

/** Segundo fator: aceita o código de 6 dígitos ou um código de recuperação (letras, números e hífen). */
export function secondFactorCode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z-]/g, "").slice(0, 32);
}

/** Par inicial: o apoio segue o idioma da tela; o alvo é inglês (ou espanhol, se o apoio já é inglês). */
export function defaultPair(locale: DisplayLocale): LanguagePair {
  const support = (SUPPORT_LANGS as readonly string[]).includes(locale) ? locale : "pt";
  return { support, target: support === "en" ? "es" : "en" };
}

/**
 * Troca um lado do par sem deixar alvo e apoio iguais: se colidirem, o outro lado
 * recebe o valor antigo (ou um padrão válido quando o antigo não serve).
 */
export function changePair(pair: LanguagePair, side: "target" | "support", value: string): LanguagePair {
  if (side === "target") {
    if (!(STUDY_TARGETS as readonly string[]).includes(value)) {
      return pair;
    }
    if (value !== pair.support) {
      return { ...pair, target: value };
    }
    return { target: value, support: pair.target };
  }
  if (!(SUPPORT_LANGS as readonly string[]).includes(value)) {
    return pair;
  }
  if (value !== pair.target) {
    return { ...pair, support: value };
  }
  const swapped = pair.support;
  const target = (STUDY_TARGETS as readonly string[]).includes(swapped) ? swapped : value === "en" ? "es" : "en";
  return { target, support: value };
}

export type SignInOutcome =
  | { kind: "session" }
  | { kind: "verify"; email: string }
  | { kind: "twoFactor"; ticket: string; methods: Array<"totp" | "email"> };

/** Classifica a resposta de signIn/signUp: sessão aberta, e-mail a confirmar ou segundo fator. */
export function classifySignIn(result: unknown, fallbackEmail: string): SignInOutcome {
  if (result && typeof result === "object") {
    const value = result as { requires_verify?: unknown; requires_2fa?: unknown; email?: unknown; ticket?: unknown; methods?: unknown };
    if (value.requires_2fa === true && typeof value.ticket === "string") {
      const methods = Array.isArray(value.methods)
        ? value.methods.filter((item): item is "totp" | "email" => item === "totp" || item === "email")
        : [];
      return { kind: "twoFactor", ticket: value.ticket, methods: methods.length > 0 ? methods : ["totp"] };
    }
    if (value.requires_verify === true) {
      return { kind: "verify", email: typeof value.email === "string" && value.email ? value.email : fallbackEmail };
    }
  }
  return { kind: "session" };
}

type CopyTable = Record<string, unknown>;

function pick(copy: CopyTable, key: string): string | null {
  const value = copy[key];
  return typeof value === "string" ? value : null;
}

/** Mensagem honesta para um erro da API de conta, no idioma da tela. */
export function accountErrorMessage(error: unknown, copy: CopyTable): string {
  const raw = error instanceof Error ? error.message : "";
  const status = error instanceof ApiError ? error.status : null;
  const known: Array<[string, string]> = [
    ["Invalid second factor", "secondFactorInvalid"],
    ["Second factor expired", "secondFactorExpired"],
    ["Reset code expired", "resetExpired"],
    ["Verify code expired", "verifyExpired"],
    ["Too many attempts", "tooManyTries"],
    ["Invalid credentials", "invalidCredentials"],
  ];
  for (const [needle, key] of known) {
    if (raw.includes(needle)) {
      const message = pick(copy, key);
      if (message) {
        return message;
      }
    }
  }
  if (status === 400 && (raw.includes("Invalid") || raw.includes("invalid"))) {
    const message = pick(copy, "checkEmailPassword");
    if (message) {
      return message;
    }
  }
  return toUserMessage(error, copy as Parameters<typeof toUserMessage>[1]);
}

/** Contagem regressiva do reenvio, em segundos inteiros, nunca negativa. */
export function cooldownLeft(sentAt: number | null, now: number, windowSeconds = 30): number {
  if (sentAt === null) {
    return 0;
  }
  return Math.max(0, Math.ceil((sentAt + windowSeconds * 1000 - now) / 1000));
}
