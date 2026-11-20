import { request } from "./http";
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
