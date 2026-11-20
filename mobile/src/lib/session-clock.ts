export const SESSION_SECONDS = 20 * 60;

export const SESSION_DURATION_SECONDS: Record<string, number> = {
  lite_20: 20 * 60,
  pro_40: 40 * 60,
  sprint_60: 60 * 60,
};

export const SESSION_PHASES = ["review", "listen", "reading", "shadow", "journal", "note"] as const;

export type SessionPhaseId = (typeof SESSION_PHASES)[number];

export interface SessionPhase {
  id: SessionPhaseId;
  start: number;
}

export interface SessionSaveState {
  version: "7.5";
  pausedAtTimestamp: number;
  sessionDurationMode: "lite_20" | "pro_40" | "sprint_60";
  elapsedSeconds: number;
  completedBlockIds: string[];
  currentBlockIndex: number;
  targetLang: string;
  accumulatedActiveSeconds: number;
}

const BASE: Record<SessionPhaseId, number> = {
  review: 180,
  listen: 120,
  reading: 300,
  shadow: 240,
  journal: 300,
  note: 60,
};

const FLOOR: Record<SessionPhaseId, number> = {
  review: 60,
  listen: 60,
  reading: 120,
  shadow: 120,
  journal: 180,
  note: 60,
};

export function sessionPhases(input: {
  dueCount: number;
  listeningGap?: number;
  slowStart?: boolean;
  totalDurationSeconds?: number;
}): SessionPhase[] {
  const sessionTotal = input.totalDurationSeconds ?? SESSION_SECONDS;
  const scaleRatio = sessionTotal / SESSION_SECONDS;

  const span: Record<SessionPhaseId, number> = {
    review: Math.round(BASE.review * scaleRatio),
    listen: Math.round(BASE.listen * scaleRatio),
    reading: Math.round(BASE.reading * scaleRatio),
    shadow: Math.round(BASE.shadow * scaleRatio),
    journal: Math.round(BASE.journal * scaleRatio),
    note: Math.round(BASE.note * scaleRatio),
  };

  const due = Math.max(0, Math.floor(input.dueCount));
  const wanted = due === 0 ? Math.round(90 * scaleRatio) : Math.min(sessionTotal / 2, Math.round((180 + Math.max(0, due - 3) * 30) * scaleRatio));
  if (wanted < span.review) {
    const freed = span.review - wanted;
    span.review = wanted;
    span.reading += freed;
  } else if (wanted > span.review) {
    let need = wanted - span.review;
    for (const donor of ["reading", "shadow", "journal", "listen"] as const) {
      if (need <= 0) {
        break;
      }
      const floorVal = Math.round(FLOOR[donor] * scaleRatio);
      const spare = span[donor] - floorVal;
      const take = Math.min(Math.max(0, spare), need);
      span[donor] -= take;
      need -= take;
    }
    span.review += wanted - Math.round(BASE.review * scaleRatio) - need;
  }
  if ((input.listeningGap ?? 0) >= 20) {
    const gift = Math.min(Math.round(120 * scaleRatio), Math.max(0, span.reading - Math.round(FLOOR.reading * scaleRatio)));
    span.reading -= gift;
    span.listen += gift;
  }
  if (input.slowStart) {
    const gift = Math.min(Math.round(60 * scaleRatio), Math.max(0, span.reading - Math.round(FLOOR.reading * scaleRatio)));
    span.reading -= gift;
    span.listen += gift;
  }
  let cursor = 0;
  return SESSION_PHASES.map((id) => {
    const start = cursor;
    cursor += span[id];
    return { id, start };
  });
}

export function serializeSessionState(state: SessionSaveState): string {
  return JSON.stringify(state);
}

export function deserializeSessionState(raw: unknown): SessionSaveState | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      obj &&
      typeof obj === "object" &&
      obj.version === "7.5" &&
      typeof obj.elapsedSeconds === "number" &&
      typeof obj.targetLang === "string"
    ) {
      return obj as SessionSaveState;
    }
    return null;
  } catch {
    return null;
  }
}

export function isSameCalendarDay(timestampA: number, timestampB: number): boolean {
  const dateA = new Date(timestampA);
  const dateB = new Date(timestampB);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function phaseAt(elapsed: number, phases: SessionPhase[]): SessionPhaseId {
  let current = phases[0]?.id ?? "review";
  for (const phase of phases) {
    if (elapsed >= phase.start) {
      current = phase.id;
    }
  }
  return current;
}

export function countDue(cards: Array<{ due?: string }>, now = Date.now()): number {
  return cards.filter((card) => {
    if (!card.due) {
      return false;
    }
    const at = Date.parse(card.due);
    return Number.isFinite(at) && at <= now;
  }).length;
}

export function listeningGap(skills: { reading: number; listening: number } | null | undefined): number {
  if (!skills) {
    return 0;
  }
  return skills.reading - skills.listening;
}

export interface ListenCheck {
  audio: string;
  options: string[];
  answer: number;
}

export function listenChecks(story: string, translation: string): ListenCheck[] {
  const spoken = sentences(story);
  const glosses = sentences(translation);
  if (spoken.length === 0 || glosses.length < 2) {
    return [];
  }
  return spoken.slice(0, 2).map((audio, index) => {
    const correct = glosses[index] ?? glosses[0]!;
    const distractors = glosses.filter((item) => item !== correct).slice(0, 2);
    return mix(correct, distractors, audio);
  });
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function mix(correct: string, distractors: string[], seed: string): ListenCheck {
  const pool = [correct, ...distractors.filter((item) => item && item !== correct)].slice(0, 3);
  const options = pool
    .map((text, index) => ({ text, index, rank: hash(`${seed}:${text}`) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((item) => item.text);
  return { audio: seed, options, answer: Math.max(0, options.indexOf(correct)) };
}

function hash(value: string): number {
  let code = 0;
  for (let index = 0; index < value.length; index += 1) {
    code = (code * 31 + value.charCodeAt(index)) >>> 0;
  }
  return code;
}

/* ------------------------------------------------------------------------ */
/* Sessão sequencial: cada etapa só libera a próxima quando o critério dela */
/* foi cumprido. Estado puro (sem armazenamento) para ser testável.          */
/* ------------------------------------------------------------------------ */

export type PhaseStatus = "done" | "current" | "locked";

export type RatingBucket = "again" | "hard" | "good" | "easy";

export interface DailyRun {
  version: 1;
  date: string;
  topic: string;
  title: string;
  unitId: string | null;
  completed: SessionPhaseId[];
  rated: string[];
  ratings: Record<RatingBucket, number>;
  listen: { right: number; total: number } | null;
  reading: { tapped: number; done: boolean };
  savedWords: number;
  shadow: { best: number | null; wpm: number | null; skipped: boolean };
  journal: { score: number } | null;
  rebuild: { score: number } | null;
  elapsed: number;
  xp: number;
  finished: boolean;
}

export function createDailyRun(input: { date: string; topic: string; title: string; unitId?: string | null }): DailyRun {
  return {
    version: 1,
    date: input.date,
    topic: input.topic,
    title: input.title,
    unitId: input.unitId ?? null,
    completed: [],
    rated: [],
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    listen: null,
    reading: { tapped: 0, done: false },
    savedWords: 0,
    shadow: { best: null, wpm: null, skipped: false },
    journal: null,
    rebuild: null,
    elapsed: 0,
    xp: 0,
    finished: false,
  };
}

function isPhaseId(value: unknown): value is SessionPhaseId {
  return typeof value === "string" && (SESSION_PHASES as readonly string[]).includes(value);
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function scoreOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Lê um `DailyRun` salvo; devolve null para qualquer coisa malformada. */
export function parseDailyRun(raw: unknown): DailyRun | null {
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
  const item = value as Partial<DailyRun>;
  if (item.version !== 1 || typeof item.date !== "string" || typeof item.topic !== "string" || typeof item.title !== "string") {
    return null;
  }
  const completed = Array.isArray(item.completed) ? item.completed.filter(isPhaseId) : [];
  const ratings = (item.ratings ?? {}) as Partial<Record<RatingBucket, number>>;
  const listen = item.listen && typeof item.listen === "object" ? { right: count(item.listen.right), total: count(item.listen.total) } : null;
  const shadow = (item.shadow ?? {}) as Partial<DailyRun["shadow"]>;
  const reading = (item.reading ?? {}) as Partial<DailyRun["reading"]>;
  return {
    version: 1,
    date: item.date,
    topic: item.topic,
    title: item.title,
    unitId: typeof item.unitId === "string" ? item.unitId : null,
    completed: SESSION_PHASES.filter((id) => completed.includes(id)),
    rated: Array.isArray(item.rated) ? item.rated.filter((key): key is string => typeof key === "string") : [],
    ratings: { again: count(ratings.again), hard: count(ratings.hard), good: count(ratings.good), easy: count(ratings.easy) },
    listen,
    reading: { tapped: count(reading.tapped), done: reading.done === true },
    savedWords: count(item.savedWords),
    shadow: { best: scoreOrNull(shadow.best), wpm: scoreOrNull(shadow.wpm), skipped: shadow.skipped === true },
    journal: item.journal && typeof item.journal === "object" && scoreOrNull(item.journal.score) !== null ? { score: item.journal.score } : null,
    rebuild: item.rebuild && typeof item.rebuild === "object" && scoreOrNull(item.rebuild.score) !== null ? { score: item.rebuild.score } : null,
    elapsed: count(item.elapsed),
    xp: count(item.xp),
    finished: item.finished === true,
  };
}

/** O mesmo dia, o mesmo tema e a mesma lição: o progresso salvo vale. */
export function runMatches(run: DailyRun | null, key: { date: string; topic: string; title: string }): run is DailyRun {
  return Boolean(run && run.date === key.date && run.topic === key.topic && run.title === key.title);
}

/** Primeira etapa ainda não concluída (a "fronteira"); "note" quando todas foram. */
export function frontierPhase(run: Pick<DailyRun, "completed">): SessionPhaseId {
  return SESSION_PHASES.find((id) => !run.completed.includes(id)) ?? "note";
}

export function phaseStatus(run: Pick<DailyRun, "completed">, id: SessionPhaseId): PhaseStatus {
  if (run.completed.includes(id)) {
    return "done";
  }
  return frontierPhase(run) === id ? "current" : "locked";
}

export function canOpenPhase(run: Pick<DailyRun, "completed">, id: SessionPhaseId): boolean {
  return phaseStatus(run, id) !== "locked";
}

export interface GateContext {
  /** Cartões da fila de revisão ainda sem nota. */
  reviewLeft: number;
}

/** Critério de conclusão de cada etapa. */
export function phaseCriterionMet(run: DailyRun, id: SessionPhaseId, context: GateContext): boolean {
  switch (id) {
    case "review":
      return context.reviewLeft <= 0;
    case "listen":
      return run.listen !== null;
    case "reading":
      return run.reading.done;
    case "shadow":
      return run.shadow.best !== null || run.shadow.wpm !== null || run.shadow.skipped;
    case "journal":
      return run.journal !== null || run.rebuild !== null;
    case "note":
      return run.finished;
    default:
      return false;
  }
}

/** Marca a etapa como concluída, só se ela é a fronteira e o critério foi cumprido. */
export function completePhase(run: DailyRun, id: SessionPhaseId, context: GateContext): DailyRun {
  if (run.completed.includes(id) || frontierPhase(run) !== id || !phaseCriterionMet(run, id, context)) {
    return run;
  }
  return { ...run, completed: SESSION_PHASES.filter((phase) => phase === id || run.completed.includes(phase)) };
}

export function nextPhase(id: SessionPhaseId): SessionPhaseId | null {
  const index = SESSION_PHASES.indexOf(id);
  return index >= 0 && index < SESSION_PHASES.length - 1 ? SESSION_PHASES[index + 1]! : null;
}

export function ratingBucket(quality: number): RatingBucket {
  if (quality <= 0) {
    return "again";
  }
  if (quality === 3) {
    return "hard";
  }
  if (quality === 4) {
    return "good";
  }
  return "easy";
}

/** Conta a nota de um cartão uma única vez por sessão. */
export function recordRating(run: DailyRun, key: string, quality: number): DailyRun {
  const normalized = key.trim().toLowerCase();
  if (!normalized || run.rated.includes(normalized)) {
    return run;
  }
  const bucket = ratingBucket(quality);
  return {
    ...run,
    rated: [...run.rated, normalized],
    ratings: { ...run.ratings, [bucket]: run.ratings[bucket] + 1 },
  };
}

export function ratedTotal(run: Pick<DailyRun, "ratings">): number {
  return run.ratings.again + run.ratings.hard + run.ratings.good + run.ratings.easy;
}

/** Duração planejada de cada etapa, em segundos, a partir do plano do relógio. */
export function phaseSpans(phases: SessionPhase[], total = SESSION_SECONDS): Record<SessionPhaseId, number> {
  const spans = { review: 0, listen: 0, reading: 0, shadow: 0, journal: 0, note: 0 } as Record<SessionPhaseId, number>;
  phases.forEach((phase, index) => {
    const end = phases[index + 1]?.start ?? total;
    spans[phase.id] = Math.max(0, end - phase.start);
  });
  return spans;
}
