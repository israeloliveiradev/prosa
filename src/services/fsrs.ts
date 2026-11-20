const WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export type FsrsQuality = 0 | 3 | 4 | 5;
export type FsrsRating = 1 | 2 | 3 | 4;
export type FsrsStatus = "learning" | "reviewing" | "mastered";

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

export function fsrsRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) {
    return 0;
  }
  return (1 + (FACTOR * elapsedDays) / stability) ** DECAY;
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
  return WEIGHTS[11]! * difficulty ** -WEIGHTS[12]! * ((stability + 1) ** WEIGHTS[13]! - 1) * Math.exp(WEIGHTS[14]! * (1 - recall));
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
        ? // FSRS-5: depois de um lapso, a estabilidade nunca passa da que o cartão tinha.
          Math.min(forgetStability(difficulty, state.stability, recall), state.stability)
        : recallStability(difficulty, state.stability, recall, rating);
  const rawDays = stability / FACTOR * (0.9 ** (1 / DECAY) - 1);
  const intervalDays = rawDays < 1 ? 0 : Math.min(36500, Math.max(1, Math.round(rawDays)));
  const dueAt = rawDays < 1 ? now + Math.max(rawDays, 10 / 1440) * DAY_MS : now + intervalDays * DAY_MS;
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
