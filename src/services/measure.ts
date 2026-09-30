import { fsrsRetrievability } from "./fsrs.js";

export const RETENTION_AIM = 90;

export function retentionRate(
  cards: Array<{ stability: number; last_review_at: Date | string | null }>,
  now = Date.now(),
): number | null {
  const held = cards.filter((card) => card.stability > 0 && card.last_review_at);
  if (held.length === 0) {
    return null;
  }
  const sum = held.reduce((total, card) => {
    const last = typeof card.last_review_at === "string" ? Date.parse(card.last_review_at) : card.last_review_at!.getTime();
    const days = Math.max(0, (now - last) / 86_400_000);
    return total + fsrsRetrievability(days, card.stability);
  }, 0);
  return Math.round((sum / held.length) * 100);
}

export function goneKinds(before: string[], after: string[]): string[] {
  const now = new Set(after.map((item) => item.toLowerCase()));
  return before.filter((item) => !now.has(item.toLowerCase()));
}
