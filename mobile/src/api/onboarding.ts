import { request } from "./http";
import {
  OnboardingResponseSchema,
  type OnboardingInput,
  type OnboardingResponse,
} from "./schemas/onboarding";

/**
 * Envia as escolhas de onboarding (interesses, trilhas de estudo e meta opcional).
 * Suporta ambas assinaturas:
 * submitOnboarding(token, input) [legada]
 * submitOnboarding(input) [nova]
 */
export async function submitOnboarding(
  tokenOrInput: string | OnboardingInput,
  maybeInput?: OnboardingInput,
): Promise<OnboardingResponse> {
  const input = typeof tokenOrInput === "string" ? maybeInput! : tokenOrInput;

  return request<OnboardingResponse>("/api/v1/onboarding/quiz", {
    method: "POST",
    body: input,
    schema: OnboardingResponseSchema,
    auth: "required",
  });
}
