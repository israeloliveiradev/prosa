/**
 * Formato gravado da jornada do primeiro dia e a leitura tolerante dele
 * (aceita o formato antigo). Puro, para os testes unitários; o armazenamento
 * fica em lib/journey.ts.
 */
import { sanitizeThemes } from "../../../lib/themes";
import {
  CORE_SESSION_MINUTES,
  isDailyMinutes,
  isGoalId,
  migrateStep,
  normalizePair,
  toCefrLevel,
  type DailyMinutes,
  type GoalId,
  type JourneyStep,
  type LevelSource,
} from "./journey-flow";

/**
 * Jornada do primeiro dia, guardada no aparelho (sobrevive ao F5).
 *
 * O backend ainda descarta o objetivo e não guarda os minutos por dia (M2),
 * então `goal`, `goal_note` e `minutes` vivem aqui. Par, temas e nível também
 * vão para a conta (POST /api/v1/onboarding/quiz).
 */
export interface JourneyState {
  userId: string;
  done: boolean;
  step: JourneyStep;
  target_lang: string;
  through_lang: string;
  interests: string[];
  /** Id do objetivo (career, travel…) ou "" se ainda não escolheu. */
  goal: GoalId | "";
  /** Texto livre opcional do objetivo. */
  goal_note: string;
  /** Meta diária em minutos (10, 20 ou 30). */
  minutes: DailyMinutes;
  level: string | null;
  level_source: LevelSource | null;
}

export const EMPTY_JOURNEY: JourneyState = {
  userId: "",
  done: false,
  step: "welcome",
  target_lang: "en",
  through_lang: "pt",
  interests: [],
  goal: "",
  goal_note: "",
  minutes: CORE_SESSION_MINUTES,
  level: null,
  level_source: null,
};

/** Lê o que estiver gravado, aceitando o formato antigo (goal em texto livre). */
export function parseJourney(raw: string | null | undefined): JourneyState {
  if (!raw) {
    return EMPTY_JOURNEY;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const userId = typeof parsed.userId === "string" ? parsed.userId : "";
    const done = parsed.done === true;
    // Jornada concluída sem dono não vale: recomeça do início.
    if (!userId && (done || parsed.step === "ready" || parsed.step === "plan")) {
      return EMPTY_JOURNEY;
    }
    const pair = normalizePair(parsed.target_lang, parsed.through_lang);
    const rawGoal = typeof parsed.goal === "string" ? parsed.goal : "";
    const goal = isGoalId(rawGoal) ? rawGoal : "";
    const legacyNote = !goal && rawGoal ? rawGoal : "";
    return {
      userId,
      done,
      step: migrateStep(parsed.step),
      target_lang: pair.target_lang,
      through_lang: pair.through_lang,
      interests: Array.isArray(parsed.interests) ? sanitizeThemes(parsed.interests) : [],
      goal,
      goal_note: typeof parsed.goal_note === "string" ? parsed.goal_note : legacyNote,
      minutes: isDailyMinutes(parsed.minutes) ? parsed.minutes : CORE_SESSION_MINUTES,
      level: toCefrLevel(parsed.level),
      level_source: parsed.level_source === "placement" || parsed.level_source === "self" ? parsed.level_source : null,
    };
  } catch {
    return EMPTY_JOURNEY;
  }
}
