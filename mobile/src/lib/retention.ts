// Imports relativos: este arquivo também é testado pelo backend (test/retention.test.ts),
// que não resolve o alias "@/".
import { cardRetrievability, isDue } from "./fsrs";
import type { SessionCard } from "./types";

export type RetentionStatus = "learning" | "reviewing" | "mastered";

export type RetentionBand = "critical" | "decaying" | "settling" | "fixed";

export interface RetentionInput {
  intervalDays: number;
  status: RetentionStatus;
  due?: boolean;
  phrase: string;
  /** Estabilidade FSRS em dias; quando existe, manda mais que o intervalo arredondado. */
  stability?: number;
}

export interface RetentionCell {
  band: RetentionBand;
  phrases: string[];
}

export interface RetentionSnapshot {
  mastered: number;
  decaying: number;
  settling: number;
  critical: number;
  /** % dos cartões na memória longa; 0 quando ainda não há cartões. */
  score: number;
  cells: RetentionCell[];
}

const CELL_SIZE = 4;
const BANDS: readonly RetentionBand[] = ["critical", "decaying", "settling", "fixed"];

function memoryDays(card: RetentionInput): number {
  return typeof card.stability === "number" && Number.isFinite(card.stability) && card.stability > 0
    ? card.stability
    : card.intervalDays;
}

export function retentionBand(card: RetentionInput): RetentionBand {
  if (card.due) {
    return "critical";
  }
  const days = memoryDays(card);
  if (days > 21) {
    return "fixed";
  }
  if (card.status === "learning" || days < 1) {
    return "critical";
  }
  if (days <= 5) {
    return "decaying";
  }
  return "settling";
}

/** Converte um cartão FSRS na entrada do mapa de retenção, com o vencimento calculado em `now`. */
export function retentionInput(card: SessionCard, now = Date.now()): RetentionInput {
  return {
    phrase: card.front_phrase,
    intervalDays: card.interval_days,
    status: card.status,
    due: isDue(card, now),
    ...(typeof card.stability === "number" && card.stability > 0 ? { stability: card.stability } : {}),
  };
}

export function retentionSnapshot(cards: readonly RetentionInput[]): RetentionSnapshot {
  const grouped = new Map<RetentionBand, string[]>(BANDS.map((band) => [band, []]));
  for (const card of cards) {
    grouped.get(retentionBand(card))?.push(card.phrase);
  }
  const cells: RetentionCell[] = [];
  for (const band of BANDS) {
    const phrases = grouped.get(band) ?? [];
    for (let index = 0; index < phrases.length; index += CELL_SIZE) {
      cells.push({ band, phrases: phrases.slice(index, index + CELL_SIZE) });
    }
  }
  const mastered = grouped.get("fixed")?.length ?? 0;
  const decaying = grouped.get("decaying")?.length ?? 0;
  const settling = grouped.get("settling")?.length ?? 0;
  const critical = grouped.get("critical")?.length ?? 0;
  const score = cards.length === 0 ? 0 : Math.round((100 * mastered) / cards.length);
  return { mastered, decaying, settling, critical, score, cells };
}

/**
 * Chance média (0..1) de lembrar agora, estimada pelo FSRS sobre os cartões já revisados.
 * `null` quando nenhum cartão foi revisado ainda (não há o que estimar).
 */
export function averageRecall(cards: readonly SessionCard[], now = Date.now()): number | null {
  const values = cards.map((card) => cardRetrievability(card, now)).filter((value): value is number => value !== null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
