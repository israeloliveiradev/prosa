import { CEFR_LEVELS, type CefrLevel } from "../types/database.js";

export interface ScoredItem {
  id: string;
  band: CefrLevel;
  answer: number;
}

export interface BandScore {
  band: CefrLevel;
  correct: number;
  total: number;
}

export interface PlacementResult {
  level: CefrLevel;
  score: number;
  correct: number;
  total: number;
  bands: BandScore[];
}

const PASS = 2 / 3;
const CUTS = [-2, -1, 0, 1, 2];

const BAND_DIFFICULTY: Record<CefrLevel, number> = {
  A1: -2.5,
  A2: -1.5,
  B1: -0.5,
  B2: 0.5,
  C1: 1.5,
  C2: 2.5,
};

export const PLACEMENT_CAP = 24;

export function bandDifficulty(band: CefrLevel): number {
  return BAND_DIFFICULTY[band];
}

export function levelFromTheta(theta: number): CefrLevel {
  if (theta < -2) {
    return "A1";
  }
  if (theta < -1) {
    return "A2";
  }
  if (theta < 0) {
    return "B1";
  }
  if (theta < 1) {
    return "B2";
  }
  if (theta < 2) {
    return "C1";
  }
  return "C2";
}

export function placementProbability(theta: number, difficulty: number): number {
  const gap = Math.max(-6, Math.min(6, theta - difficulty));
  return 1 / (1 + Math.exp(-gap));
}

export function observePlacement(
  theta: number,
  information: number,
  difficulty: number,
  correct: boolean,
): { theta: number; information: number; se: number } {
  const expected = placementProbability(theta, difficulty);
  const gained = Math.max(0.05, expected * (1 - expected));
  const nextInformation = information + gained;
  const delta = ((correct ? 1 : 0) - expected) * 0.9;
  const nextTheta = Math.max(-3.2, Math.min(3.2, theta + delta));
  return {
    theta: nextTheta,
    information: nextInformation,
    se: 1 / Math.sqrt(nextInformation),
  };
}

export function placementShouldStop(input: { asked: number; theta: number; information: number }): boolean {
  if (input.asked >= PLACEMENT_CAP) {
    return true;
  }
  if (input.asked < 8) {
    return false;
  }
  const se = 1 / Math.sqrt(Math.max(input.information, 0.01));
  if (se <= 0.35) {
    return true;
  }
  if (input.asked >= 14) {
    const distance = Math.min(...CUTS.map((cut) => Math.abs(input.theta - cut)));
    if (distance >= 0.45) {
      return true;
    }
  }
  if (input.asked < 12) {
    return false;
  }
  const margin = 1.28 * se;
  const low = input.theta - margin;
  const high = input.theta + margin;
  return !CUTS.some((cut) => low < cut && high > cut);
}

export interface SkillScore {
  skill: "vocab" | "grammar" | "reading" | "listening";
  correct: number;
  total: number;
}

export function skillScores(
  items: Array<{ id: string; kind: string; answer: number }>,
  answers: Record<string, number>,
): SkillScore[] {
  const skills = ["vocab", "grammar", "reading", "listening"] as const;
  return skills.flatMap((skill) => {
    const inSkill = items.filter((item) => item.kind === skill);
    if (inSkill.length === 0) {
      return [];
    }
    const correct = inSkill.filter((item) => answers[item.id] === item.answer).length;
    return [{ skill, correct, total: inSkill.length }];
  });
}

export function placeLevel(items: ScoredItem[], answers: Record<string, number>): PlacementResult {
  const bands: BandScore[] = CEFR_LEVELS.map((band) => {
    const inBand = items.filter((item) => item.band === band);
    const correct = inBand.filter((item) => answers[item.id] === item.answer).length;
    return { band, correct, total: inBand.length };
  });
  let level: CefrLevel = "A1";
  for (const row of bands) {
    if (row.total === 0) {
      continue;
    }
    if (row.correct / row.total >= PASS) {
      level = row.band;
      continue;
    }
    break;
  }
  const correct = items.filter((item) => answers[item.id] === item.answer).length;
  const total = Math.max(1, items.length);
  return {
    level,
    score: Math.round((100 * correct) / total),
    correct,
    total: items.length,
    bands,
  };
}

export function daysUntilRetest(finishedAt: Date, now = new Date()): number {
  const due = finishedAt.getTime() + 21 * 24 * 60 * 60 * 1000;
  return Math.ceil((due - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function retestOpen(input: {
  lastFinishedAt: Date | null;
  lessonsSince: number;
  now?: Date;
}): { due: boolean; reason: "never" | "scheduled" | "lessons" | "wait"; days_until: number | null } {
  const now = input.now ?? new Date();
  if (!input.lastFinishedAt) {
    return { due: true, reason: "never", days_until: 0 };
  }
  const elapsedDays = (now.getTime() - input.lastFinishedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (elapsedDays < 7) {
    return { due: false, reason: "wait", days_until: Math.ceil(7 - elapsedDays) };
  }
  const scheduled = daysUntilRetest(input.lastFinishedAt, now);
  if (scheduled <= 0) {
    return { due: true, reason: "scheduled", days_until: 0 };
  }
  if (input.lessonsSince >= 10) {
    return { due: true, reason: "lessons", days_until: 0 };
  }
  return { due: false, reason: "wait", days_until: scheduled };
}
