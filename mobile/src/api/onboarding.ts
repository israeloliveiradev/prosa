import type { DisplayLocale } from "@/lib/i18n";
import { request } from "./http";
import {
  AccountSettingsSchema,
  type AccountGoal,
  type AccountMinutes,
  type AccountSettings,
} from "./schemas/auth";
import {
  OnboardingResponseSchema,
  type OnboardingInput,
  type OnboardingResponse,
} from "./schemas/onboarding";

/**
 * Envia as escolhas do primeiro dia (temas, trilhas, nível e objetivo).
 * Atenção: o backend troca TODAS as trilhas da conta pelas enviadas; quem
 * chama deve mandar também as que já existem (veja features/onboarding/save-plan.ts).
 *
 * Suporta ambas assinaturas:
 * submitOnboarding(token, input) [legada]
 * submitOnboarding(input) [nova]
 */
export async function submitOnboarding(
  tokenOrInput: string | OnboardingInput,
  maybeInput?: OnboardingInput,
): Promise<OnboardingResponse> {
  const input = typeof tokenOrInput === "string" ? maybeInput : tokenOrInput;
  if (!input) {
    throw new Error("submitOnboarding: missing input");
  }

  return request<OnboardingResponse>("/api/v1/onboarding/quiz", {
    method: "POST",
    body: input,
    schema: OnboardingResponseSchema,
    auth: "required",
  });
}

/** Preferências do plano que moram na conta (PATCH /api/v1/account/settings, backend M2). */
export interface AccountPrefsPatch {
  /** null apaga o objetivo. */
  goal?: AccountGoal | null;
  /** null ou "" apaga a nota. */
  goal_note?: string | null;
  daily_minutes?: AccountMinutes;
  display_locale?: DisplayLocale;
}

/**
 * Grava objetivo, nota, minutos por dia e/ou idioma de interface na conta e devolve
 * os ajustes como o servidor guardou.
 */
export async function saveAccountPrefs(patch: AccountPrefsPatch, options: { signal?: AbortSignal } = {}): Promise<AccountSettings> {
  return request<AccountSettings>("/api/v1/account/settings", {
    method: "PATCH",
    body: patch,
    schema: AccountSettingsSchema,
    auth: "required",
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
