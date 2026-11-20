import type { SessionCard } from "./types";

/**
 * FSRS (Free Spaced Repetition Scheduler) do lado do cliente.
 *
 * Espelha `src/services/fsrs.ts` do backend (mesmos pesos, retenção desejada de 90%),
 * para que o cartão agende na hora, offline, e o servidor confirme no `/srs/sync`.
 * A nota 0|3|4|5 do app vira a avaliação FSRS 1 (de novo) | 2 (difícil) | 3 (bom) | 4 (fácil).
 */
const WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Depois de um "de novo", o cartão volta em 10 minutos no mínimo. */
const RELEARN_MS = 10 * 60 * 1000;

export type ReviewQuality = 0 | 3 | 4 | 5;
export type FsrsQuality = ReviewQuality;
export type FsrsRating = 1 | 2 | 3 | 4;
export type FsrsStatus = "learning" | "reviewing" | "mastered";

export const REVIEW_QUALITIES: readonly ReviewQuality[] = [0, 3, 4, 5];

export interface FsrsState {
  stability: number;
  difficulty: number;
  reps: number;
  lastReviewAt: number | null;
}

export interface FsrsUpdate {
  stability: number;
  difficulty: number;
  reps: number;
  intervalDays: number;
  dueAt: number;
  status: FsrsStatus;
  easeFactor: number;
}

export function isReviewQuality(value: unknown): value is ReviewQuality {
  return value === 0 || value === 3 || value === 4 || value === 5;
}

export function fsrsRating(quality: FsrsQuality): FsrsRating {
  if (quality === 0) {
    return 1;
  }
  if (quality === 3) {
    return 2;
  }
  if (quality === 5) {
    return 4;
  }
  return 3;
}

function clampDifficulty(value: number): number {
  return Math.min(10, Math.max(1, value));
}

function initDifficulty(rating: FsrsRating): number {
  return clampDifficulty(WEIGHTS[4]! - Math.exp(WEIGHTS[5]! * (rating - 1)) + 1);
}

function nextDifficulty(difficulty: number, rating: FsrsRating): number {
  const next = difficulty - WEIGHTS[6]! * (rating - 3);
  const easy = initDifficulty(4);
  return clampDifficulty(WEIGHTS[7]! * easy + (1 - WEIGHTS[7]!) * next);
}

/** Probabilidade (0..1) de lembrar depois de `elapsedDays` com a estabilidade dada. */
export function fsrsRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) {
    return 0;
  }
  return (1 + (FACTOR * Math.max(0, elapsedDays)) / stability) ** DECAY;
}

function recallStability(difficulty: number, stability: number, recall: number, rating: FsrsRating): number {
  const hardPenalty = rating === 2 ? WEIGHTS[15]! : 1;
  const easyBonus = rating === 4 ? WEIGHTS[16]! : 1;
  return (
    stability *
    (Math.exp(WEIGHTS[8]!) *
      (11 - difficulty) *
      stability ** -WEIGHTS[9]! *
      (Math.exp((1 - recall) * WEIGHTS[10]!) - 1) *
      hardPenalty *
      easyBonus +
      1)
  );
}

function forgetStability(difficulty: number, stability: number, recall: number): number {
  const next =
    WEIGHTS[11]! * difficulty ** -WEIGHTS[12]! * ((stability + 1) ** WEIGHTS[13]! - 1) * Math.exp(WEIGHTS[14]! * (1 - recall));
  // FSRS-5: esquecer nunca deixa o cartão mais estável do que estava antes do lapso.
  return Math.min(next, stability);
}

function easeFactor(difficulty: number): number {
  return Math.min(9.99, Math.max(1.3, Math.round(difficulty * 100) / 100));
}

export function scheduleFsrs(state: FsrsState, quality: FsrsQuality, now = Date.now()): FsrsUpdate {
  const rating = fsrsRating(quality);
  const first = state.reps <= 0 || state.stability <= 0;
  const elapsedDays = first || state.lastReviewAt === null ? 0 : Math.max(0, (now - state.lastReviewAt) / DAY_MS);
  const recall = first ? 0 : fsrsRetrievability(elapsedDays, state.stability);
  const difficulty = first ? initDifficulty(rating) : nextDifficulty(state.difficulty || initDifficulty(3), rating);
  const stability =
    first
      ? WEIGHTS[rating - 1]!
      : rating === 1
        ? Math.min(forgetStability(difficulty, state.stability, recall), state.stability) // FSRS-5: o lapso nunca aumenta a estabilidade (igual ao servidor)
        : recallStability(difficulty, state.stability, recall, rating);
  // Com retenção desejada de 0,9 o intervalo ideal em dias é a própria estabilidade.
  const rawDays = (stability / FACTOR) * (0.9 ** (1 / DECAY) - 1);
  const intervalDays = rawDays < 1 ? 0 : Math.min(36500, Math.max(1, Math.round(rawDays)));
  const dueAt = rawDays < 1 ? now + Math.max(rawDays * DAY_MS, RELEARN_MS) : now + intervalDays * DAY_MS;
  const status: FsrsStatus = rating === 1 || intervalDays < 1 ? "learning" : intervalDays >= 21 ? "mastered" : "reviewing";
  return {
    stability,
    difficulty,
    reps: state.reps + 1,
    intervalDays,
    dueAt,
    status,
    easeFactor: easeFactor(difficulty),
  };
}

function parseTime(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const at = Date.parse(value);
  return Number.isFinite(at) ? at : null;
}

/** Estado FSRS gravado no cartão (cartão novo ⇒ estabilidade 0, sem revisão). */
export function fsrsStateOf(card: SessionCard): FsrsState {
  return {
    stability: typeof card.stability === "number" && Number.isFinite(card.stability) ? card.stability : 0,
    difficulty: typeof card.difficulty === "number" && Number.isFinite(card.difficulty) ? card.difficulty : 0,
    reps: card.repetition_count,
    lastReviewAt: parseTime(card.reviewed_at),
  };
}

export function applyFsrs(card: SessionCard, quality: ReviewQuality, now = Date.now()): SessionCard {
  const next = scheduleFsrs(fsrsStateOf(card), quality, now);
  return {
    ...card,
    repetition_count: next.reps,
    interval_days: next.intervalDays,
    ease_factor: next.easeFactor,
    status: next.status,
    stability: next.stability,
    difficulty: next.difficulty,
    due: new Date(next.dueAt).toISOString(),
    reviewed_at: new Date(now).toISOString(),
  };
}

/** Momento (ms) em que o cartão vence; `null` para cartão novo, que ainda não foi revisado. */
export function dueTime(card: Pick<SessionCard, "due">): number | null {
  return parseTime(card.due);
}

export function isDue(card: Pick<SessionCard, "due">, now = Date.now()): boolean {
  const at = dueTime(card);
  return at !== null && at <= now;
}

/** Cartão que nunca recebeu nota (sem data de vencimento). */
export function isNewCard(card: Pick<SessionCard, "due" | "repetition_count">): boolean {
  return dueTime(card) === null;
}

/** Ordena pelo vencimento, o mais atrasado primeiro; empate pela frase, para ser estável. */
export function compareDue(a: SessionCard, b: SessionCard): number {
  const left = dueTime(a) ?? Number.POSITIVE_INFINITY;
  const right = dueTime(b) ?? Number.POSITIVE_INFINITY;
  if (left !== right) {
    return left < right ? -1 : 1;
  }
  return a.front_phrase.localeCompare(b.front_phrase);
}

/** Cartões vencidos em `now`, ordenados pelo vencimento (o mais atrasado primeiro). */
export function dueCards<T extends SessionCard>(cards: readonly T[], now = Date.now()): T[] {
  return cards.filter((card) => isDue(card, now)).sort(compareDue);
}

/** Chance estimada (0..1) de lembrar o cartão agora; `null` para cartão novo. */
export function cardRetrievability(card: SessionCard, now = Date.now()): number | null {
  const state = fsrsStateOf(card);
  if (state.stability <= 0 || state.lastReviewAt === null) {
    return null;
  }
  return fsrsRetrievability((now - state.lastReviewAt) / DAY_MS, state.stability);
}

/**
 * Cartões gravados no tempo do SM-2 (intervalo e repetições, sem estabilidade nem vencimento)
 * entram no FSRS com a estabilidade igual ao último intervalo e vencidos agora, para que a
 * próxima revisão recalibre a memória em vez de o cartão sumir da fila para sempre.
 */
export function seedFromSm2(card: SessionCard, now = Date.now()): SessionCard {
  const hasFsrs = typeof card.stability === "number" && card.stability > 0;
  if (hasFsrs || card.repetition_count <= 0) {
    return card;
  }
  const stability = Math.max(0.1, card.interval_days || 0);
  return {
    ...card,
    stability,
    difficulty: typeof card.difficulty === "number" && card.difficulty > 0 ? card.difficulty : 5,
    due: card.due ?? new Date(now).toISOString(),
    reviewed_at: card.reviewed_at ?? new Date(now - stability * DAY_MS).toISOString(),
  };
}
