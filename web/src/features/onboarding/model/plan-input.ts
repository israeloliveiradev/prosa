/**
 * Monta o corpo de POST /api/v1/onboarding/quiz a partir das escolhas do aluno.
 * Puro, para testar sem rede.
 */
import type { OnboardingCopy } from "../../../lib/copy/onboarding";
import { sanitizeThemes } from "../../../lib/themes";
import {
  composeGoal,
  isStudyTarget,
  isSupportLang,
  toCefrLevel,
  type CefrLevel,
  type GoalId,
  type SaveErrorKind,
  type StudyTarget,
  type SupportLang,
} from "./journey-flow";

export interface TrackLike {
  target_lang: string;
  through_lang: string;
  level?: string | null;
  active?: boolean;
}

export interface PlanTrack {
  target_lang: StudyTarget;
  through_lang: SupportLang;
  level?: CefrLevel;
  active: boolean;
}

export interface PlanChoices {
  target_lang: StudyTarget;
  through_lang: SupportLang;
  level: CefrLevel;
  interests: readonly string[];
  goal: GoalId | null;
  goal_note: string;
}

export interface PlanInput {
  interests: string[];
  goal?: string;
  level: CefrLevel;
  target_lang: StudyTarget;
  through_lang: SupportLang;
  tracks: PlanTrack[];
}

/** O backend aceita no máximo 7 trilhas, uma por idioma de estudo. */
const MAX_TRACKS = 7;

/**
 * O backend troca TODAS as trilhas pelas enviadas. Para não apagar os outros
 * cursos do aluno, mantém cada trilha existente e põe o par escolhido como a
 * ativa, com o nível novo.
 */
export function mergeTracks(existing: readonly TrackLike[], active: { target_lang: StudyTarget; through_lang: SupportLang; level: CefrLevel }): PlanTrack[] {
  const tracks: PlanTrack[] = [{ ...active, active: true }];
  for (const track of existing) {
    if (tracks.length >= MAX_TRACKS) break;
    if (!isStudyTarget(track.target_lang) || !isSupportLang(track.through_lang)) continue;
    if (track.target_lang === track.through_lang) continue;
    if (tracks.some((item) => item.target_lang === track.target_lang)) continue;
    const level = toCefrLevel(track.level);
    tracks.push({
      target_lang: track.target_lang,
      through_lang: track.through_lang,
      ...(level ? { level } : {}),
      active: false,
    });
  }
  return tracks;
}

/** Nível da trilha já existente para um idioma, se houver. */
export function trackLevel(existing: readonly TrackLike[], target: string): CefrLevel | null {
  const found = existing.find((track) => track.target_lang === target);
  return found ? toCefrLevel(found.level) : null;
}

export function buildPlanInput(choices: PlanChoices, existing: readonly TrackLike[] = []): PlanInput {
  const goal = composeGoal(choices.goal, choices.goal_note);
  return {
    interests: sanitizeThemes(choices.interests),
    ...(goal ? { goal } : {}),
    level: choices.level,
    target_lang: choices.target_lang,
    through_lang: choices.through_lang,
    tracks: mergeTracks(existing, {
      target_lang: choices.target_lang,
      through_lang: choices.through_lang,
      level: choices.level,
    }),
  };
}

/**
 * Lê o nível do resultado do nivelamento embutido. Aceita o formato do
 * contrato (`{ level }`), o da API (`{ result_level }`) ou o código puro.
 */
export function levelFromOutcome(outcome: unknown): CefrLevel | null {
  if (typeof outcome === "string") {
    return toCefrLevel(outcome);
  }
  if (!outcome || typeof outcome !== "object") {
    return null;
  }
  const record = outcome as Record<string, unknown>;
  return (
    toCefrLevel(record.level) ??
    toCefrLevel(record.result_level) ??
    toCefrLevel(record.resultLevel) ??
    (record.result && typeof record.result === "object" ? levelFromOutcome(record.result) : null)
  );
}

/** Classifica um erro da API (ApiError ou Error) para escolher a mensagem. */
export function saveErrorKind(error: unknown): SaveErrorKind {
  if (error && typeof error === "object") {
    const record = error as { kind?: unknown; status?: unknown; message?: unknown };
    if (record.kind === "network" || record.kind === "timeout") {
      return "offline";
    }
    if (record.status === 429) {
      return "busy";
    }
    if (typeof record.message === "string" && /failed to fetch|networkerror|network request failed/i.test(record.message)) {
      return "offline";
    }
  }
  return "failed";
}

/** Texto do erro de salvamento no idioma da interface. */
export function errorMessage(t: Pick<OnboardingCopy, "errorOffline" | "errorBusy" | "errorFailed">, kind: SaveErrorKind): string {
  if (kind === "offline") return t.errorOffline;
  if (kind === "busy") return t.errorBusy;
  return t.errorFailed;
}
