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
