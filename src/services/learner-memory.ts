export interface MemoryError {
  note: string;
  count: number;
}

export interface LearnerMemory {
  facts: string[];
  goals: string[];
  errors: MemoryError[];
  thread: string;
}

export interface MemoryPatch {
  facts: string[];
  goal: string;
  error: string;
  thread: string;
}

export type RepairStep = "none" | "prompt" | "hint" | "correction";

const EMPTY: LearnerMemory = { facts: [], goals: [], errors: [], thread: "" };

function clean(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function same(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function emptyMemory(): LearnerMemory {
  return { facts: [], goals: [], errors: [], thread: "" };
}

export function readMemory(value: Partial<LearnerMemory> | null | undefined): LearnerMemory {
  if (!value) {
    return emptyMemory();
  }
  const facts = Array.isArray(value.facts) ? value.facts.filter((item): item is string => typeof item === "string") : [];
  const goals = Array.isArray(value.goals) ? value.goals.filter((item): item is string => typeof item === "string") : [];
  const errors = Array.isArray(value.errors)
    ? value.errors.flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }
        const note = "note" in item && typeof item.note === "string" ? item.note : "";
        const count = "count" in item && typeof item.count === "number" ? item.count : 0;
        return note.trim() ? [{ note: note.trim(), count: Math.max(1, Math.round(count)) }] : [];
      })
    : [];
  return {
    facts: facts.map((item) => clean(item, 80)).filter(Boolean).slice(-12),
    goals: goals.map((item) => clean(item, 80)).filter(Boolean).slice(-4),
    errors: errors.slice(0, 8),
    thread: typeof value.thread === "string" ? clean(value.thread, 240) : "",
  };
}

const STEP_RANK: Record<RepairStep, number> = { none: 0, prompt: 1, hint: 2, correction: 3 };

export function feedbackStep(attempt: number, mistake: string, errors: MemoryError[]): RepairStep {
  const fromAttempt: RepairStep = attempt <= 1 ? "prompt" : attempt === 2 ? "hint" : "correction";
  const fromMemory = clean(mistake, 80) ? repairStep(mistake, errors) : "none";
  return STEP_RANK[fromMemory] > STEP_RANK[fromAttempt] ? fromMemory : fromAttempt;
}

export function repairStep(mistake: string, errors: MemoryError[]): RepairStep {
  const note = clean(mistake, 80);
  if (!note) {
    return "none";
  }
  const found = errors.find((item) => same(item.note, note));
  const count = found?.count ?? 0;
  if (count <= 0) {
    return "prompt";
  }
  if (count === 1) {
    return "hint";
  }
  return "correction";
}

export function mergeMemory(current: LearnerMemory | null, patch: MemoryPatch): LearnerMemory {
  const base = current ?? EMPTY;
  const facts = [...base.facts];
  for (const raw of patch.facts) {
    const next = clean(raw, 80);
    if (!next || facts.some((item) => same(item, next))) {
      continue;
    }
    facts.push(next);
  }
  const goals = [...base.goals];
  const goal = clean(patch.goal, 80);
  if (goal && !goals.some((item) => same(item, goal))) {
    goals.push(goal);
  }
  const errors = base.errors.map((item) => ({ ...item }));
  const error = clean(patch.error, 80);
  if (error) {
    const found = errors.find((item) => same(item.note, error));
    if (found) {
      found.count += 1;
    } else {
      errors.push({ note: error, count: 1 });
    }
  }
  errors.sort((left, right) => right.count - left.count);
  return {
    facts: facts.slice(-12),
    goals: goals.slice(-4),
    errors: errors.slice(0, 8),
    thread: clean(patch.thread, 240) || base.thread,
  };
}
