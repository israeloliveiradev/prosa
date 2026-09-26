export type RetentionStatus = "learning" | "reviewing" | "mastered";

export type RetentionBand = "critical" | "decaying" | "settling" | "fixed";

export interface RetentionInput {
  intervalDays: number;
  status: RetentionStatus;
  due?: boolean;
  phrase: string;
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
  score: number;
  cells: RetentionCell[];
}

const CELL_SIZE = 4;
const BANDS: readonly RetentionBand[] = ["critical", "decaying", "settling", "fixed"];

export function retentionBand(card: RetentionInput): RetentionBand {
  if (card.due) {
    return "critical";
  }
  if (card.intervalDays > 21) {
    return "fixed";
  }
  if (card.status === "learning" || card.intervalDays === 0) {
    return "critical";
  }
  if (card.intervalDays <= 5) {
    return "decaying";
  }
  return "settling";
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
  const score = cards.length === 0 ? 100 : Math.round((100 * mastered) / cards.length);
  return { mastered, decaying, settling, critical, score, cells };
}
