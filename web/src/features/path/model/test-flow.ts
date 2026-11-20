import type { CheckpointFinish, PathTestAnswer, PathTestItem, UnitTestFinish } from "@/api/schemas/path";
import type { PathErrorKind } from "./path-model";

/**
 * Fluxo do teste da unidade e do checkpoint da banda: começar → uma pergunta por vez →
 * terminar → resultado. Estado puro (testado em tests/unit/path-model.test.ts).
 * As respostas certas nunca chegam ao aparelho: só a escolha de cada item vai ao servidor.
 */

export type TestMode = "unit" | "checkpoint";

export interface TestAttempt {
  attemptId: string;
  band: string | null;
  items: PathTestItem[];
}

export type TestResult = { mode: "unit"; data: UnitTestFinish } | { mode: "checkpoint"; data: CheckpointFinish };

export type TestPhase = "intro" | "starting" | "answering" | "sending" | "result" | "error";

export interface TestFlowState {
  phase: TestPhase;
  attempt: TestAttempt | null;
  answers: Record<string, number>;
  index: number;
  result: TestResult | null;
  error: { kind: PathErrorKind; during: "start" | "finish" } | null;
}

export type TestFlowAction =
  | { type: "START_REQUESTED" }
  | { type: "START_SUCCEEDED"; attempt: TestAttempt }
  | { type: "START_FAILED"; kind: PathErrorKind }
  | { type: "RESTORED"; attempt: TestAttempt; answers: Record<string, number>; index: number }
  | { type: "PICK"; choice: number }
  | { type: "GO"; index: number }
  | { type: "FINISH_REQUESTED" }
  | { type: "FINISH_SUCCEEDED"; result: TestResult }
  | { type: "FINISH_FAILED"; kind: PathErrorKind }
  | { type: "RESET" };

export const INITIAL_TEST_FLOW: TestFlowState = { phase: "intro", attempt: null, answers: {}, index: 0, result: null, error: null };

function clampIndex(index: number, attempt: TestAttempt | null): number {
  const last = Math.max(0, (attempt?.items.length ?? 1) - 1);
  return Math.min(Math.max(0, Math.floor(Number.isFinite(index) ? index : 0)), last);
}

export function testFlowReducer(state: TestFlowState, action: TestFlowAction): TestFlowState {
  switch (action.type) {
    case "START_REQUESTED":
      return { ...INITIAL_TEST_FLOW, phase: "starting" };
    case "START_SUCCEEDED":
      return { ...INITIAL_TEST_FLOW, phase: "answering", attempt: action.attempt };
    case "START_FAILED":
      return { ...INITIAL_TEST_FLOW, phase: "error", error: { kind: action.kind, during: "start" } };
    case "RESTORED": {
      const ids = new Set(action.attempt.items.map((item) => item.id));
      const answers = Object.fromEntries(Object.entries(action.answers).filter(([id, choice]) => ids.has(id) && Number.isInteger(choice) && choice >= 0));
      return { ...INITIAL_TEST_FLOW, phase: "answering", attempt: action.attempt, answers, index: clampIndex(action.index, action.attempt) };
    }
    case "PICK": {
      const item = state.attempt?.items[state.index];
      if (state.phase !== "answering" || !item || !Number.isInteger(action.choice) || action.choice < 0 || action.choice >= item.options.length) {
        return state;
      }
      return { ...state, answers: { ...state.answers, [item.id]: action.choice } };
    }
    case "GO":
      if (state.phase !== "answering") {
        return state;
      }
      return { ...state, index: clampIndex(action.index, state.attempt) };
    case "FINISH_REQUESTED":
      if (!state.attempt || !allAnswered(state)) {
        return state;
      }
      return { ...state, phase: "sending", error: null };
    case "FINISH_SUCCEEDED":
      return { ...state, phase: "result", result: action.result, error: null };
    case "FINISH_FAILED":
      // Tentativa vencida não volta para as perguntas: precisa começar de novo.
      return action.kind === "expired"
        ? { ...INITIAL_TEST_FLOW, phase: "error", error: { kind: action.kind, during: "finish" } }
        : { ...state, phase: "answering", error: { kind: action.kind, during: "finish" } };
    case "RESET":
      return INITIAL_TEST_FLOW;
    default:
      return state;
  }
}

export function answeredCount(state: Pick<TestFlowState, "attempt" | "answers">): number {
  return state.attempt ? state.attempt.items.filter((item) => state.answers[item.id] !== undefined).length : 0;
}

export function allAnswered(state: Pick<TestFlowState, "attempt" | "answers">): boolean {
  return Boolean(state.attempt && state.attempt.items.length > 0 && answeredCount(state) === state.attempt.items.length);
}

/** Respostas na ordem dos itens, no formato do contrato. */
export function answersPayload(state: Pick<TestFlowState, "attempt" | "answers">): PathTestAnswer[] {
  if (!state.attempt) {
    return [];
  }
  return state.attempt.items
    .filter((item) => state.answers[item.id] !== undefined)
    .map((item) => ({ item_id: item.id, choice: state.answers[item.id] }));
}

/** Tentativa guardada no aparelho (sobrevive ao F5). */
export interface StoredTest {
  attempt: TestAttempt;
  answers: Record<string, number>;
  index: number;
  savedAt: number;
}

/** Tentativas guardadas há mais de 2 horas não são retomadas. */
export const STORED_TEST_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function parseStoredTest(raw: unknown, now = Date.now()): StoredTest | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const item = value as Partial<StoredTest>;
  const attempt = item.attempt as Partial<TestAttempt> | undefined;
  if (
    !attempt ||
    typeof attempt.attemptId !== "string" ||
    !Array.isArray(attempt.items) ||
    attempt.items.length === 0 ||
    typeof item.savedAt !== "number" ||
    now - item.savedAt > STORED_TEST_MAX_AGE_MS
  ) {
    return null;
  }
  const items = attempt.items.filter(
    (entry): entry is PathTestItem =>
      Boolean(entry) && typeof entry.id === "string" && typeof entry.prompt === "string" && Array.isArray(entry.options) && entry.options.every((option) => typeof option === "string"),
  );
  if (items.length !== attempt.items.length) {
    return null;
  }
  const answers = item.answers && typeof item.answers === "object" ? (item.answers as Record<string, number>) : {};
  return {
    attempt: { attemptId: attempt.attemptId, band: typeof attempt.band === "string" ? attempt.band : null, items },
    answers,
    index: typeof item.index === "number" ? item.index : 0,
    savedAt: item.savedAt,
  };
}
