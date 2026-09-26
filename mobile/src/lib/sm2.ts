import type { SessionCard } from "@/lib/types";

export type ReviewQuality = 0 | 3 | 4 | 5;

export function applySm2(card: SessionCard, quality: ReviewQuality): SessionCard {
  if (quality < 3) {
    return {
      ...card,
      repetition_count: 0,
      interval_days: 1,
      status: "learning",
    };
  }

  const gap = 5 - quality;
  const rawEase = card.ease_factor + (0.1 - gap * (0.08 + gap * 0.02));
  const easeFactor = Math.min(9.99, Math.max(1.3, Math.round(rawEase * 100) / 100));
  let intervalDays = 1;
  if (card.repetition_count === 1) {
    intervalDays = 6;
  } else if (card.repetition_count > 1) {
    intervalDays = Math.min(36500, Math.max(1, Math.round(card.interval_days * easeFactor)));
  }

  return {
    ...card,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    repetition_count: card.repetition_count + 1,
    status: intervalDays >= 21 ? "mastered" : "reviewing",
  };
}
