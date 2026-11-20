/** Lógica pura do Duelo: leitura da rodada do servidor, pontos e fim de rodada. */
export interface DuelDrillItem {
  prompt: string;
  options: string[];
  answer: number;
}

export interface DuelRoundData {
  drills: DuelDrillItem[];
  focus: string[];
  unit_id: string | null;
  best: number | null;
}

export const DUEL_MIN_DRILLS = 8;

export function parseDuelRound(raw: unknown): DuelRoundData {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const drills = (Array.isArray(body.drills) ? body.drills : []).flatMap((item): DuelDrillItem[] => {
    const drill = item as Partial<DuelDrillItem> | null;
    if (
      drill &&
      typeof drill.prompt === "string" &&
      Array.isArray(drill.options) &&
      drill.options.length === 4 &&
      drill.options.every((option) => typeof option === "string") &&
      typeof drill.answer === "number" &&
      Number.isInteger(drill.answer) &&
      drill.answer >= 0 &&
      drill.answer <= 3
    ) {
      return [{ prompt: drill.prompt, options: drill.options, answer: drill.answer }];
    }
    return [];
  });
  if (drills.length < DUEL_MIN_DRILLS) {
    throw new Error("O duelo não trouxe frases suficientes.");
  }
  const focus = (Array.isArray(body.focus) ? body.focus : []).filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  const best = typeof body.best === "number" && Number.isFinite(body.best) && body.best >= 0 ? Math.round(body.best) : null;
  const unitId = typeof body.unit_id === "string" && body.unit_id.trim() ? body.unit_id.trim() : null;
  return { drills, focus, unit_id: unitId, best };
}

/** Pontos de um acerto: 10 x combo (o servidor limita score <= 5 x acertos x (acertos + 1)). */
export function pointsFor(combo: number): number {
  return 10 * Math.max(1, combo);
}

export interface DuelTally {
  score: number;
  combo: number;
  bestCombo: number;
  correct: number;
  answered: number;
}

export const EMPTY_TALLY: DuelTally = { score: 0, combo: 0, bestCombo: 0, correct: 0, answered: 0 };

export function applyAnswer(tally: DuelTally, right: boolean): DuelTally {
  if (!right) {
    return { ...tally, combo: 0, answered: tally.answered + 1 };
  }
  const combo = tally.combo + 1;
  return {
    score: tally.score + pointsFor(combo),
    combo,
    bestCombo: Math.max(tally.bestCombo, combo),
    correct: tally.correct + 1,
    answered: tally.answered + 1,
  };
}

/** Trilha unit id como "a1-01"; qualquer outra coisa vira null (modo livre). */
export function unitParam(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && /^[a-c][12]-\d{2}$/i.test(raw.trim()) ? raw.trim().toLowerCase() : null;
}
