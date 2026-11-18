import type {
  PlacementAttempt,
  PlacementItem,
  PlacementFinish,
} from "@/api/schemas/placement";

export type PlacementPhase = "intro" | "loading" | "play" | "result" | "error";

export interface PlacementFlowState {
  phase: PlacementPhase;
  attempt: PlacementAttempt | null;
  currentIndex: number;
  pickedOption: number | null;
  result: PlacementFinish | null;
  pending: boolean;
  error: string | null;
  canDoSaved: boolean;
}

export type PlacementFlowEvent =
  | { type: "START_ATTEMPT"; attempt: PlacementAttempt }
  | { type: "PICK_OPTION"; choice: number }
  | { type: "ANSWER_SUCCESS"; nextItem: PlacementItem | null; done: boolean }
  | { type: "SET_RESULT"; result: PlacementFinish }
  | { type: "SET_PHASE"; phase: PlacementPhase }
  | { type: "SET_PENDING"; pending: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SAVE_CAN_DO" }
  | { type: "RESET" };

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function deltaLabel(
  previousLevel: string | null | undefined,
  nextLevel: string,
  copy: { placeUp?: string; placeDown?: string; placeSame?: string } = {},
): string {
  if (!previousLevel || previousLevel === nextLevel) {
    return copy.placeSame ?? "Nível mantido";
  }
  const prevIdx = CEFR_ORDER.indexOf(previousLevel);
  const nextIdx = CEFR_ORDER.indexOf(nextLevel);
  if (nextIdx > prevIdx) {
    return copy.placeUp ?? "Subiu de nível";
  }
  return copy.placeDown ?? "Ajustou nível";
}

export function skillPercentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
}

export function initialPlacementFlowState(options: {
  autoStart?: boolean;
} = {}): PlacementFlowState {
  return {
    phase: options.autoStart ? "loading" : "intro",
    attempt: null,
    currentIndex: 0,
    pickedOption: null,
    result: null,
    pending: false,
    error: null,
    canDoSaved: false,
  };
}

export function placementFlowReducer(
  state: PlacementFlowState,
  event: PlacementFlowEvent,
): PlacementFlowState {
  switch (event.type) {
    case "START_ATTEMPT":
      return {
        ...state,
        phase: "play",
        attempt: event.attempt,
        currentIndex: event.attempt.index || 0,
        pickedOption: null,
        pending: false,
        error: null,
      };

    case "PICK_OPTION":
      return {
        ...state,
        pickedOption: event.choice,
        error: null,
      };

    case "ANSWER_SUCCESS": {
      if (event.done || !event.nextItem) {
        return {
          ...state,
          phase: "loading",
          pickedOption: null,
          pending: true,
          error: null,
        };
      }

      const currentItems = state.attempt?.items || [];
      const updatedItems = [...currentItems, event.nextItem];

      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        pickedOption: null,
        pending: false,
        error: null,
        attempt: state.attempt
          ? {
              ...state.attempt,
              items: updatedItems,
              index: state.currentIndex + 1,
            }
          : null,
      };
    }

    case "SET_RESULT":
      return {
        ...state,
        phase: "result",
        result: event.result,
        pending: false,
        error: null,
      };

    case "SET_PHASE":
      return {
        ...state,
        phase: event.phase,
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
        phase: "error",
        pending: false,
      };

    case "SAVE_CAN_DO":
      return {
        ...state,
        canDoSaved: true,
      };

    case "RESET":
      return initialPlacementFlowState();

    default:
      return state;
  }
}
