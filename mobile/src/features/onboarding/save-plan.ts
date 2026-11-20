import { activateStudyTrack, listStudyTracks } from "@/api/study";
import { submitOnboarding } from "@/api/onboarding";
import type { OnboardingResponse } from "@/api/schemas/onboarding";
import { refreshSession } from "@/lib/session";
import { buildPlanInput, type PlanChoices } from "./model/plan-input";
import type { StudyTarget, SupportLang } from "./model/journey-flow";

/**
 * Grava o plano na conta: lista as trilhas que já existem (o backend troca
 * todas pelas enviadas), envia par + temas + nível + objetivo e atualiza a
 * sessão para que user.target_lang, level e interests reflitam a escolha.
 */
export async function savePlan(choices: PlanChoices): Promise<OnboardingResponse> {
  const existing = await listStudyTracks();
  const result = await submitOnboarding(buildPlanInput(choices, existing));
  await refreshSession();
  return result;
}

/**
 * Troca o curso ativo na conta antes do nivelamento, para que o teste
 * adaptativo meça o idioma escolhido (o backend usa user.target_lang).
 */
export async function activatePair(target_lang: StudyTarget, through_lang: SupportLang): Promise<void> {
  await activateStudyTrack({ target_lang, through_lang });
  await refreshSession();
}
