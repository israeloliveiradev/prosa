export type JourneyStep = "welcome" | "pair" | "interests" | "place" | "ready";

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  "welcome",
  "pair",
  "interests",
  "place",
  "ready",
] as const;

export interface JourneyFlowState {
  step: JourneyStep;
  target_lang: string;
  through_lang: string;
  interests: string[];
  goal: string;
  level: string | null;
  pending: boolean;
  error: string | null;
}

export type JourneyFlowEvent =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_STEP"; step: JourneyStep }
  | { type: "SET_TARGET_LANG"; lang: string }
  | { type: "SET_THROUGH_LANG"; lang: string }
  | { type: "SET_PAIR"; target_lang: string; through_lang: string }
  | { type: "TOGGLE_INTEREST"; interest: string }
  | { type: "SET_GOAL"; goal: string }
  | { type: "FINISH_PLACEMENT"; level: string }
  | { type: "SET_PENDING"; pending: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

export function previousStep(step: JourneyStep): JourneyStep | null {
  switch (step) {
    case "ready":
      return "place";
    case "place":
      return "interests";
    case "interests":
      return "pair";
    case "pair":
      return "welcome";
    case "welcome":
    default:
      return null;
  }
}

export function nextStep(step: JourneyStep): JourneyStep | null {
  switch (step) {
    case "welcome":
      return "pair";
    case "pair":
      return "interests";
    case "interests":
      return "place";
    case "place":
      return "ready";
    case "ready":
    default:
      return null;
  }
}

export function stepIndex(step: JourneyStep): number {
  const idx = JOURNEY_STEPS.indexOf(step);
  return idx >= 0 ? idx : 0;
}

export function validatePair(target: string, through: string): { valid: boolean; through: string } {
  if (target === through) {
    // Alterna para português ou inglês se forem iguais
    const alt = target === "en" ? "pt" : "en";
    return { valid: false, through: alt };
  }
  return { valid: true, through };
}

export function initialJourneyFlowState(initial?: Partial<JourneyFlowState>): JourneyFlowState {
  return {
    step: initial?.step ?? "welcome",
    target_lang: initial?.target_lang ?? "en",
    through_lang: initial?.through_lang ?? "pt",
    interests: initial?.interests ?? [],
    goal: initial?.goal ?? "",
    level: initial?.level ?? null,
    pending: false,
    error: null,
  };
}

export function journeyFlowReducer(
  state: JourneyFlowState,
  event: JourneyFlowEvent,
): JourneyFlowState {
  switch (event.type) {
    case "NEXT_STEP": {
      const next = nextStep(state.step);
      if (!next) return state;
      return {
        ...state,
        step: next,
        error: null,
      };
    }

    case "PREV_STEP": {
      const prev = previousStep(state.step);
      if (!prev) return state;
      return {
        ...state,
        step: prev,
        error: null,
      };
    }

    case "SET_STEP":
      return {
        ...state,
        step: event.step,
        error: null,
      };

    case "SET_TARGET_LANG": {
      const { through } = validatePair(event.lang, state.through_lang);
      return {
        ...state,
        target_lang: event.lang,
        through_lang: through,
        error: null,
      };
    }

    case "SET_THROUGH_LANG": {
      if (event.lang === state.target_lang) {
        return state;
      }
      return {
        ...state,
        through_lang: event.lang,
        error: null,
      };
    }

    case "SET_PAIR": {
      const { through } = validatePair(event.target_lang, event.through_lang);
      return {
        ...state,
        target_lang: event.target_lang,
        through_lang: through,
        error: null,
      };
    }

    case "TOGGLE_INTEREST": {
      const exists = state.interests.includes(event.interest);
      const updated = exists
        ? state.interests.filter((i) => i !== event.interest)
        : [...state.interests, event.interest].slice(0, 12);
      return {
        ...state,
        interests: updated,
        error: null,
      };
    }

    case "SET_GOAL":
      return {
        ...state,
        goal: event.goal,
      };

    case "FINISH_PLACEMENT":
      return {
        ...state,
        step: "ready",
        level: event.level,
        error: null,
      };

    case "SET_PENDING":
      return {
        ...state,
        pending: event.pending,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: event.error,
        pending: false,
      };

    case "RESET":
      return initialJourneyFlowState();

    default:
      return state;
  }
}
