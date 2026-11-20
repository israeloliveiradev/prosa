/**
 * Modelo puro da jornada do primeiro dia (/start).
 *
 * boas-vindas → par → objetivo → temas → tempo diário → nível → plano pessoal.
 *
 * Sem React, sem armazenamento: o reducer só decide o próximo estado, e as
 * telas cuidam da API (lib/journey + api/onboarding). Assim os testes unitários
 * rodam em Node puro.
 */
import { MAX_THEMES, addTheme, removeTheme, sanitizeThemes, toggleTheme } from "../../../lib/themes";

export type JourneyStep = "welcome" | "pair" | "goal" | "themes" | "time" | "level" | "plan";

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  "welcome",
  "pair",
  "goal",
  "themes",
  "time",
  "level",
  "plan",
] as const;

/** Passos que aparecem na régua "Passo n de N" (a boas-vindas fica fora). */
export const COUNTED_STEPS: readonly JourneyStep[] = ["pair", "goal", "themes", "time", "level", "plan"] as const;

/** Idiomas de estudo. Português nunca é alvo: só entra como apoio. */
export const STUDY_TARGETS = ["en", "es", "de", "fr", "it", "ja", "ru"] as const;
export type StudyTarget = (typeof STUDY_TARGETS)[number];

/** Idiomas de apoio (explicações e traduções): português + os alvos. */
export const SUPPORT_LANGS = ["pt", ...STUDY_TARGETS] as const;
export type SupportLang = (typeof SUPPORT_LANGS)[number];

export const DEFAULT_TARGET: StudyTarget = "en";
export const DEFAULT_SUPPORT: SupportLang = "pt";

export const GOAL_IDS = ["career", "travel", "studies", "culture", "family", "relocation"] as const;
export type GoalId = (typeof GOAL_IDS)[number];

/** Limite do backend para `goal` (POST /api/v1/onboarding/quiz). */
export const MAX_GOAL_LENGTH = 200;
/** Espaço para o texto livre, depois do id do objetivo e do separador. */
export const MAX_GOAL_NOTE_LENGTH = 160;

/** A sessão central tem 20 minutos (PRODUCT.md); 10 e 30 ajustam a meta diária. */
export const DAILY_MINUTES = [10, 20, 30] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];
export const CORE_SESSION_MINUTES: DailyMinutes = 20;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type LevelSource = "placement" | "self";

/** Por que o salvamento falhou, para a tela escolher o texto certo. */
export type SaveErrorKind = "offline" | "busy" | "failed";

export interface JourneyFlowState {
  step: JourneyStep;
  target_lang: StudyTarget;
  through_lang: SupportLang;
  goal: GoalId | null;
  goal_note: string;
  interests: string[];
  minutes: DailyMinutes;
  level: CefrLevel | null;
  level_source: LevelSource | null;
  pending: boolean;
  error: SaveErrorKind | null;
}

/** Valores soltos (do armazenamento ou da conta) para montar o estado inicial. */
export interface JourneyFlowSeed {
  step?: string;
  target_lang?: string;
  through_lang?: string;
  goal?: string | null;
  goal_note?: string;
  interests?: readonly unknown[];
  minutes?: number;
  level?: string | null;
  level_source?: string | null;
}

export type JourneyFlowEvent =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_STEP"; step: JourneyStep }
  | { type: "SET_TARGET_LANG"; lang: string }
  | { type: "SET_THROUGH_LANG"; lang: string }
  | { type: "SET_GOAL"; goal: string }
  | { type: "SET_GOAL_NOTE"; note: string }
  | { type: "TOGGLE_INTEREST"; interest: string }
  | { type: "ADD_INTEREST"; interest: string }
  | { type: "REMOVE_INTEREST"; interest: string }
  | { type: "SET_MINUTES"; minutes: number }
  | { type: "SAVE_START"; level?: string; source?: LevelSource }
  | { type: "SAVE_OK" }
  | { type: "SAVE_FAIL"; error: SaveErrorKind }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET"; initial?: JourneyFlowSeed };

export function isJourneyStep(value: unknown): value is JourneyStep {
  return typeof value === "string" && (JOURNEY_STEPS as readonly string[]).includes(value);
}

/** Converte passos gravados por versões antigas da jornada. */
export function migrateStep(value: unknown): JourneyStep {
  if (isJourneyStep(value)) {
    return value;
  }
  switch (value) {
    case "interests":
      return "themes";
    case "place":
      return "level";
    case "ready":
      return "plan";
    default:
      return "welcome";
  }
}

export function isStudyTarget(value: unknown): value is StudyTarget {
  return typeof value === "string" && (STUDY_TARGETS as readonly string[]).includes(value);
}

export function isSupportLang(value: unknown): value is SupportLang {
  return typeof value === "string" && (SUPPORT_LANGS as readonly string[]).includes(value);
}

export function isGoalId(value: unknown): value is GoalId {
  return typeof value === "string" && (GOAL_IDS as readonly string[]).includes(value);
}

export function isDailyMinutes(value: unknown): value is DailyMinutes {
  return typeof value === "number" && (DAILY_MINUTES as readonly number[]).includes(value);
}

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === "string" && (CEFR_LEVELS as readonly string[]).includes(value);
}

/** Aceita "b1" ou "B1"; devolve null para qualquer outra coisa. */
export function toCefrLevel(value: unknown): CefrLevel | null {
  if (typeof value !== "string") {
    return null;
  }
  const upper = value.trim().toUpperCase();
  return isCefrLevel(upper) ? upper : null;
}

export function previousStep(step: JourneyStep): JourneyStep | null {
  const index = JOURNEY_STEPS.indexOf(step);
  return index > 0 ? JOURNEY_STEPS[index - 1] ?? null : null;
}

export function nextStep(step: JourneyStep): JourneyStep | null {
  const index = JOURNEY_STEPS.indexOf(step);
  return index >= 0 && index < JOURNEY_STEPS.length - 1 ? JOURNEY_STEPS[index + 1] ?? null : null;
}

export function stepIndex(step: JourneyStep): number {
  const idx = JOURNEY_STEPS.indexOf(step);
  return idx >= 0 ? idx : 0;
}

/** Posição na régua (1-indexada) ou null para a boas-vindas. */
export function stepProgress(step: JourneyStep): { current: number; total: number } | null {
  const idx = COUNTED_STEPS.indexOf(step);
  return idx >= 0 ? { current: idx + 1, total: COUNTED_STEPS.length } : null;
}

/**
 * Garante um par válido: alvo entre os 7 idiomas de estudo, apoio entre
 * português + alvos, e os dois nunca iguais. O apoio padrão é português.
 */
export function normalizePair(target: unknown, through: unknown): { target_lang: StudyTarget; through_lang: SupportLang } {
  const target_lang = isStudyTarget(target) ? target : DEFAULT_TARGET;
  const through_lang = isSupportLang(through) && through !== target_lang ? through : DEFAULT_SUPPORT;
  return { target_lang, through_lang };
}

export function validatePair(target: string, through: string): { valid: boolean; through: SupportLang } {
  const fixed = normalizePair(target, through);
  const valid = isStudyTarget(target) && isSupportLang(through) && target !== through;
  return { valid, through: fixed.through_lang };
}

/**
 * Texto enviado como `goal` ao backend: o id estável do objetivo, mais o texto
 * livre opcional ("career: apresentar projetos"). Cabe nos 200 caracteres.
 */
export function composeGoal(goal: GoalId | null, note: string): string | undefined {
  const cleanNote = note.replace(/\s+/g, " ").trim().slice(0, MAX_GOAL_NOTE_LENGTH);
  if (!goal) {
    return cleanNote ? cleanNote.slice(0, MAX_GOAL_LENGTH) : undefined;
  }
  return (cleanNote ? `${goal}: ${cleanNote}` : goal).slice(0, MAX_GOAL_LENGTH);
}

/** Inverso de composeGoal, para ler o objetivo de volta. */
export function parseGoal(raw: unknown): { goal: GoalId | null; note: string } {
  if (typeof raw !== "string") {
    return { goal: null, note: "" };
  }
  const text = raw.trim();
  const match = /^([a-z]+)(?::\s*(.*))?$/s.exec(text);
  if (match && isGoalId(match[1])) {
    return { goal: match[1], note: (match[2] ?? "").trim() };
  }
  return { goal: null, note: text };
}

/** Minutos por semana para a meta diária escolhida. */
export function weeklyMinutes(minutes: DailyMinutes): number {
  return minutes * 7;
}

/** Se o passo atual já tem o que precisa para seguir. */
export function canContinue(state: JourneyFlowState, step: JourneyStep = state.step): boolean {
  switch (step) {
    case "welcome":
      return true;
    case "pair":
      return validatePair(state.target_lang, state.through_lang).valid;
    case "goal":
      return state.goal !== null;
    case "themes":
      return state.interests.length >= 1 && state.interests.length <= MAX_THEMES;
    case "time":
      return isDailyMinutes(state.minutes);
    case "level":
      return state.level !== null;
    case "plan":
      return state.level !== null;
    default:
      return false;
  }
}

export function initialJourneyFlowState(initial?: JourneyFlowSeed): JourneyFlowState {
  const pair = normalizePair(initial?.target_lang, initial?.through_lang);
  return {
    step: isJourneyStep(initial?.step) ? initial.step : "welcome",
    target_lang: pair.target_lang,
    through_lang: pair.through_lang,
    goal: initial?.goal && isGoalId(initial.goal) ? initial.goal : null,
    goal_note: typeof initial?.goal_note === "string" ? initial.goal_note.slice(0, MAX_GOAL_NOTE_LENGTH) : "",
    interests: sanitizeThemes(initial?.interests ?? []),
    minutes: isDailyMinutes(initial?.minutes) ? initial.minutes : CORE_SESSION_MINUTES,
    level: toCefrLevel(initial?.level),
    level_source: initial?.level_source === "placement" || initial?.level_source === "self" ? initial.level_source : null,
    pending: false,
    error: null,
  };
}

export function journeyFlowReducer(state: JourneyFlowState, event: JourneyFlowEvent): JourneyFlowState {
  switch (event.type) {
    case "NEXT_STEP": {
      const next = nextStep(state.step);
      if (!next || state.pending || !canContinue(state)) return state;
      return { ...state, step: next, error: null };
    }

    case "PREV_STEP": {
      const prev = previousStep(state.step);
      if (!prev || state.pending) return state;
      return { ...state, step: prev, error: null };
    }

    case "SET_STEP":
      if (state.pending || !isJourneyStep(event.step)) return state;
      return { ...state, step: event.step, error: null };

    case "SET_TARGET_LANG": {
      if (!isStudyTarget(event.lang)) return state;
      const through_lang = state.through_lang === event.lang ? DEFAULT_SUPPORT : state.through_lang;
      return { ...state, target_lang: event.lang, through_lang, error: null };
    }

    case "SET_THROUGH_LANG": {
      if (!isSupportLang(event.lang) || event.lang === state.target_lang) return state;
      return { ...state, through_lang: event.lang, error: null };
    }

    case "SET_GOAL":
      if (!isGoalId(event.goal)) return state;
      return { ...state, goal: event.goal };

    case "SET_GOAL_NOTE":
      return { ...state, goal_note: event.note.slice(0, MAX_GOAL_NOTE_LENGTH) };

    case "TOGGLE_INTEREST":
      return { ...state, interests: toggleTheme(state.interests, event.interest), error: null };

    case "ADD_INTEREST": {
      const result = addTheme(state.interests, event.interest);
      if (result.status !== "added") return state;
      return { ...state, interests: result.list, error: null };
    }

    case "REMOVE_INTEREST":
      return { ...state, interests: removeTheme(state.interests, event.interest), error: null };

    case "SET_MINUTES":
      if (!isDailyMinutes(event.minutes)) return state;
      return { ...state, minutes: event.minutes };

    case "SAVE_START": {
      const level = event.level === undefined ? state.level : toCefrLevel(event.level);
      if (!level) return state;
      return {
        ...state,
        level,
        level_source: event.source ?? state.level_source,
        pending: true,
        error: null,
      };
    }

    case "SAVE_OK":
      return { ...state, step: "plan", pending: false, error: null };

    case "SAVE_FAIL":
      return { ...state, pending: false, error: event.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "RESET":
      return initialJourneyFlowState(event.initial);

    default:
      return state;
  }
}
