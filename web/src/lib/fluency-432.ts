export const FLUENCY_LAPS = [240, 180, 120] as const;
export const FLUENCY_CYCLE = 3;

export interface FluencyLap {
  index: 0 | 1 | 2;
  seconds: (typeof FLUENCY_LAPS)[number];
}

export interface FluencyScore {
  words: number;
  pauses: number;
  wpm: number;
}

export function fluencyDay(date: string, cycle = FLUENCY_CYCLE): boolean {
  if (cycle <= 1) {
    return true;
  }
  const day = Number(date.slice(-2));
  if (!Number.isFinite(day) || day <= 0) {
    return false;
  }
  return day % cycle === 0;
}

export function fluencyLaps(): FluencyLap[] {
  return FLUENCY_LAPS.map((seconds, index) => ({
    index: index as 0 | 1 | 2,
    seconds,
  }));
}

export function fluencyScore(spoken: string, elapsedMs: number): FluencyScore {
  const words = countWords(spoken);
  const pauses = countPauses(spoken);
  const minutes = Math.max(elapsedMs, 1) / 60_000;
  return {
    words,
    pauses,
    wpm: Math.round(words / minutes),
  };
}

export function recurringSlips(notes: Array<{ original: string }>, spoken = ""): string[] {
  const seen = new Set<string>();
  const slips: string[] = [];
  for (const note of notes) {
    const text = note.original.trim();
    const key = text.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (hitsIn(spoken, text) >= 2) {
      slips.push(text);
    }
  }
  return slips;
}

function hitsIn(spoken: string, phrase: string): number {
  const hay = spoken.toLowerCase();
  const needle = phrase.trim().toLowerCase();
  if (!needle) {
    return 0;
  }
  let count = 0;
  let from = 0;
  while (from <= hay.length) {
    const at = hay.indexOf(needle, from);
    if (at < 0) {
      break;
    }
    count += 1;
    from = at + needle.length;
  }
  return count;
}

function countWords(spoken: string): number {
  return spoken
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function countPauses(spoken: string): number {
  const marks = spoken.match(/[.!?…,;:—\-]|(\s{2,})/g) ?? [];
  return marks.length;
}
