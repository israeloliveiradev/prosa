import { activateStudyTrack, listStudyTracks } from "@/api/study";
import { saveAccountPrefs, submitOnboarding } from "@/api/onboarding";
import type { OnboardingResponse } from "@/api/schemas/onboarding";
import { getJourney } from "@/lib/journey";
import { getSession, refreshSession, rememberProfile } from "@/lib/session";
import { buildPlanInput, type PlanChoices } from "./model/plan-input";
import { MAX_GOAL_NOTE_LENGTH, type DailyMinutes, type StudyTarget, type SupportLang } from "./model/journey-flow";

export interface SavePlanChoices extends PlanChoices {
  /**
   * Meta diária. Sem ela, vale a da jornada deste aparelho (o primeiro dia grava os
   * minutos na jornada antes de salvar o plano).
   */
  minutes?: DailyMinutes;
}

/** Minutos a gravar: os escolhidos, ou os da jornada deste aluno neste aparelho. */
function planMinutes(choices: SavePlanChoices): DailyMinutes | undefined {
  if (choices.minutes) {
    return choices.minutes;
  }
  const journey = getJourney();
  const userId = getSession()?.user.id;
  return userId && journey.userId === userId ? journey.minutes : undefined;
}

/**
 * Grava o plano na conta:
 * 1. lista as trilhas que já existem (o backend troca todas pelas enviadas) e envia
 *    par + temas + nível (POST /onboarding/quiz);
 * 2. grava objetivo, nota e minutos por dia nos ajustes da conta (PATCH /account/settings);
 * 3. atualiza a sessão para que user.target_lang, level, interests, goal e daily_minutes
 *    reflitam a escolha.
 * Qualquer falha sobe para a tela, que mostra o erro e oferece tentar de novo (repetir é seguro).
 */
export async function savePlan(choices: SavePlanChoices): Promise<OnboardingResponse> {
  const existing = await listStudyTracks();
  const result = await submitOnboarding(buildPlanInput(choices, existing));
  const minutes = planMinutes(choices);
  const note = choices.goal ? choices.goal_note.trim().slice(0, MAX_GOAL_NOTE_LENGTH) : "";
  const saved = await saveAccountPrefs({
    goal: choices.goal,
    goal_note: note.length > 0 ? note : null,
    ...(minutes ? { daily_minutes: minutes } : {}),
  });
  rememberProfile({
    goal: saved.goal ?? null,
    goal_note: saved.goal_note ?? null,
    ...(saved.daily_minutes ? { daily_minutes: saved.daily_minutes } : {}),
  });
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
