import { ApiError } from "@/api/errors";
import type {
  PlacementAttempt,
  PlacementBand,
  PlacementBandScore,
  PlacementFinish,
  PlacementItem,
  PlacementSkill,
  PlacementSkillScore,
  PlacementStatus,
  PlacementStep,
} from "@/api/schemas/placement";

/**
 * Modelo puro do nivelamento adaptativo: estados da tela, transições e as contas
 * que a interface mostra. Tudo o que aparece na tela sai do servidor ou destas funções.
 */

/** O que a tela de nivelamento entrega a quem a embute (o onboarding) ao terminar. */
export interface PlacementOutcome {
  level: PlacementBand;
  previousLevel?: PlacementBand;
  bands: PlacementBandScore[];
  skills: PlacementSkillScore[];
}

export type PlacementPhase = "status" | "starting" | "question" | "finishing" | "result";

export type PlacementErrorKind = "offline" | "slow" | "not-ready" | "rate-limited" | "session" | "closed" | "unknown";

export interface PlacementFlowState {
  phase: PlacementPhase;
  status: PlacementStatus | null;
  statusLoading: boolean;
  statusError: PlacementErrorKind | null;
  attempt: PlacementAttempt | null;
  picked: number | null;
  pending: boolean;
  error: PlacementErrorKind | null;
  result: PlacementFinish | null;
}

export type PlacementFlowEvent =
  | { type: "STATUS_REQUESTED" }
  | { type: "STATUS_LOADED"; status: PlacementStatus }
  | { type: "STATUS_FAILED"; error: PlacementErrorKind }
  | { type: "START_REQUESTED" }
  | { type: "START_SUCCEEDED"; attempt: PlacementAttempt }
  | { type: "START_FAILED"; error: PlacementErrorKind }
  | { type: "PICKED"; choice: number }
  | { type: "ANSWER_REQUESTED" }
  | { type: "ANSWER_SUCCEEDED"; itemId: string; choice: number; step: PlacementStep }
  | { type: "ANSWER_FAILED"; error: PlacementErrorKind }
  | { type: "FINISH_REQUESTED" }
  | { type: "FINISH_SUCCEEDED"; result: PlacementFinish }
  | { type: "FINISH_FAILED"; error: PlacementErrorKind }
  | { type: "BACK_TO_STATUS" };

export function initialPlacementFlowState(options: { autoStart?: boolean } = {}): PlacementFlowState {
  return {
    phase: options.autoStart ? "starting" : "status",
    status: null,
    statusLoading: !options.autoStart,
    statusError: null,
    attempt: null,
    picked: null,
    pending: Boolean(options.autoStart),
    error: null,
    result: null,
  };
}

/** Pergunta que está na vez, ou `null` se a tentativa não tem uma. */
export function currentItem(attempt: PlacementAttempt | null): PlacementItem | null {
  if (!attempt) {
    return null;
  }
  return attempt.items[attempt.index] ?? null;
}

/** Todas as perguntas servidas já têm resposta: falta só fechar a tentativa. */
export function isAttemptComplete(attempt: PlacementAttempt): boolean {
  return attempt.items.length > 0 && attempt.items.every((item) => attempt.answered[item.id] !== undefined);
}

/** Opção já respondida para a pergunta da vez (tentativas fixas permitem voltar a ela). */
function savedChoice(attempt: PlacementAttempt): number | null {
  const item = currentItem(attempt);
  if (!item) {
    return null;
  }
  const choice = attempt.answered[item.id];
  return typeof choice === "number" ? choice : null;
}

/**
 * Aplica a resposta do servidor à tentativa local.
 * - Adaptativa: o motor devolve a próxima pergunta, ou `done` quando o nível ficou claro.
 * - Fixa (tentativas antigas): avança o índice até o fim da lista.
 */
export function applyAnswer(
  attempt: PlacementAttempt,
  itemId: string,
  choice: number,
  step: PlacementStep,
): { attempt: PlacementAttempt; done: boolean } {
  const answered = { ...attempt.answered, [itemId]: choice };
  const cap = step.cap ?? attempt.cap;
  if (attempt.adaptive) {
    if (step.done || !step.next) {
      return { attempt: { ...attempt, answered, cap }, done: true };
    }
    const items = [...attempt.items.filter((item) => item.id !== step.next?.id), step.next];
    return { attempt: { ...attempt, items, answered, index: items.length - 1, cap }, done: false };
  }
  const nextIndex = attempt.index + 1;
  if (step.done || nextIndex >= attempt.items.length) {
    return { attempt: { ...attempt, answered }, done: true };
  }
  return { attempt: { ...attempt, answered, index: nextIndex }, done: false };
}

export function placementFlowReducer(state: PlacementFlowState, event: PlacementFlowEvent): PlacementFlowState {
  switch (event.type) {
    case "STATUS_REQUESTED":
      return { ...state, statusLoading: true, statusError: null };
    case "STATUS_LOADED":
      return { ...state, status: event.status, statusLoading: false, statusError: null };
    case "STATUS_FAILED":
      return { ...state, statusLoading: false, statusError: event.error };
    case "START_REQUESTED":
      return { ...state, phase: "starting", pending: true, error: null };
    case "START_SUCCEEDED": {
      if (isAttemptComplete(event.attempt)) {
        return { ...state, phase: "finishing", attempt: event.attempt, picked: null, pending: true, error: null };
      }
      return {
        ...state,
        phase: "question",
        attempt: event.attempt,
        picked: savedChoice(event.attempt),
        pending: false,
        error: null,
      };
    }
    case "START_FAILED":
      return { ...state, phase: "starting", pending: false, error: event.error };
    case "PICKED":
      if (state.phase !== "question" || state.pending) {
        return state;
      }
      return { ...state, picked: event.choice, error: null };
    case "ANSWER_REQUESTED":
      return { ...state, pending: true, error: null };
    case "ANSWER_SUCCEEDED": {
      if (!state.attempt) {
        return state;
      }
      const next = applyAnswer(state.attempt, event.itemId, event.choice, event.step);
      if (next.done) {
        return { ...state, phase: "finishing", attempt: next.attempt, picked: null, pending: true, error: null };
      }
      return { ...state, attempt: next.attempt, picked: savedChoice(next.attempt), pending: false, error: null };
    }
    case "ANSWER_FAILED":
      return { ...state, pending: false, error: event.error };
    case "FINISH_REQUESTED":
      return { ...state, phase: "finishing", pending: true, error: null };
    case "FINISH_SUCCEEDED":
      return { ...state, phase: "result", result: event.result, pending: false, error: null };
    case "FINISH_FAILED":
      return { ...state, phase: "finishing", pending: false, error: event.error };
    case "BACK_TO_STATUS":
      return { ...state, phase: "status", attempt: null, picked: null, pending: false, error: null };
    default:
      return state;
  }
}

/** Traduz uma falha da API num tipo de aviso honesto para a tela. */
export function placementErrorKind(error: unknown): PlacementErrorKind {
  if (error instanceof ApiError) {
    if (error.kind === "network") {
      return "offline";
    }
    if (error.kind === "timeout") {
      return "slow";
    }
    if (error.kind === "auth" || error.status === 401) {
      return "session";
    }
    if (error.status === 429) {
      return "rate-limited";
    }
    if (error.status === 503) {
      return "not-ready";
    }
    if (error.status === 409) {
      return "closed";
    }
    return "unknown";
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "offline";
  }
  return "unknown";
}

/** O servidor recusou a resposta porque a pergunta da vez é outra (estado divergente). */
export function isOutOfSync(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400;
}

export type PlacementStatusKind = "open" | "never" | "due" | "wait";

/** Situação do idioma: teste aberto, nunca medido, liberado para medir de novo ou em espera. */
export function statusKind(status: PlacementStatus): PlacementStatusKind {
  if (status.open_attempt_id) {
    return "open";
  }
  if (!status.last) {
    return "never";
  }
  return status.due ? "due" : "wait";
}

/** Se a tela pode oferecer um teste agora (a espera entre testes é respeitada). */
export function canStartPlacement(kind: PlacementStatusKind): boolean {
  return kind !== "wait";
}

/** Dia em que o próximo teste abre, contado a partir de `days_until` do servidor. */
export function nextTestDate(status: PlacementStatus, now: Date = new Date()): Date | null {
  if (status.days_until === null || status.days_until === undefined || status.days_until <= 0) {
    return null;
  }
  return new Date(now.getTime() + status.days_until * 24 * 60 * 60 * 1000);
}

export function toOutcome(result: PlacementFinish): PlacementOutcome {
  return {
    level: result.level,
    ...(result.previous_level ? { previousLevel: result.previous_level } : {}),
    bands: result.bands.map((band) => ({ ...band })),
    skills: result.skills.map((skill) => ({ ...skill })),
  };
}

const CEFR_ORDER: readonly PlacementBand[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type LevelDelta = "first" | "up" | "down" | "same";

export function levelDelta(previous: PlacementBand | null | undefined, next: PlacementBand): LevelDelta {
  if (!previous) {
    return "first";
  }
  const before = CEFR_ORDER.indexOf(previous);
  const after = CEFR_ORDER.indexOf(next);
  if (after > before) {
    return "up";
  }
  if (after < before) {
    return "down";
  }
  return "same";
}

/** Parte certa em 0–100 (barras de faixa e de habilidade). */
export function percent(correct: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
}

/** Faixas do resultado na ordem do CEFR, só as que tiveram perguntas. */
export function orderedBands(bands: PlacementBandScore[]): PlacementBandScore[] {
  return bands
    .filter((band) => band.total > 0)
    .slice()
    .sort((left, right) => CEFR_ORDER.indexOf(left.band) - CEFR_ORDER.indexOf(right.band));
}

const SIGNAL_KEY: Record<PlacementSkill, "vocabulary" | "grammar" | "reading" | "listening"> = {
  vocab: "vocabulary",
  grammar: "grammar",
  reading: "reading",
  listening: "listening",
};

/** Sinais de perfil (`/profile/signals`) a partir das habilidades medidas no teste. */
export function skillSignals(skills: PlacementSkillScore[]): Partial<Record<"vocabulary" | "grammar" | "reading" | "listening", number>> {
  const signals: Partial<Record<"vocabulary" | "grammar" | "reading" | "listening", number>> = {};
  for (const skill of skills) {
    if (skill.total > 0) {
      signals[SIGNAL_KEY[skill.skill]] = percent(skill.correct, skill.total);
    }
  }
  return signals;
}

/** Preenche `{chave}` num texto da tabela de cópia. */
export function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Nome do idioma no idioma da interface, via Intl; o código volta se o motor não souber. */
export function languageLabel(code: string, bcp47: string, options: { capitalize?: boolean } = {}): string {
  let name = code;
  try {
    const names = new Intl.DisplayNames([bcp47], { type: "language" });
    name = names.of(code) ?? code;
  } catch {
    name = code;
  }
  if (options.capitalize && name.length > 0) {
    return name.charAt(0).toLocaleUpperCase(bcp47) + name.slice(1);
  }
  return name;
}

/** Data curta no idioma da interface (ex.: "19 de nov. de 2026"). */
export function formatDay(value: Date | string, bcp47: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(bcp47, { day: "numeric", month: "short", year: "numeric" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
