import { expect, test } from "@playwright/test";
import {
  DAY_MS,
  applyFsrs,
  cardRetrievability,
  compareDue,
  dueCards,
  fsrsRating,
  isDue,
  isNewCard,
  scheduleFsrs,
  seedFromSm2,
} from "@/lib/fsrs";
import type { SessionCard } from "@/lib/types";

const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);

function card(phrase: string, patch: Partial<SessionCard> = {}): SessionCard {
  return {
    id: `c-${phrase}`,
    front_phrase: phrase,
    back_translation: `${phrase} (pt)`,
    context_sentence: `A sentence with ${phrase}.`,
    repetition_count: 0,
    interval_days: 0,
    ease_factor: 2.5,
    status: "learning",
    ...patch,
  };
}

test.describe("FSRS: agendamento", () => {
  test("nota 0|3|4|5 vira avaliação 1|2|3|4", () => {
    expect(fsrsRating(0)).toBe(1);
    expect(fsrsRating(3)).toBe(2);
    expect(fsrsRating(4)).toBe(3);
    expect(fsrsRating(5)).toBe(4);
  });

  test("primeira revisão: de novo < difícil < bom < fácil", () => {
    const fresh = { stability: 0, difficulty: 0, reps: 0, lastReviewAt: null };
    const again = scheduleFsrs(fresh, 0, T0);
    const hard = scheduleFsrs(fresh, 3, T0);
    const good = scheduleFsrs(fresh, 4, T0);
    const easy = scheduleFsrs(fresh, 5, T0);

    expect(again.intervalDays).toBe(0);
    expect(again.status).toBe("learning");
    expect(again.dueAt).toBeGreaterThan(T0);
    expect(again.dueAt).toBeLessThan(T0 + DAY_MS);

    expect(hard.intervalDays).toBe(1);
    expect(good.intervalDays).toBe(3);
    expect(easy.intervalDays).toBe(16);
    expect(good.status).toBe("reviewing");
    expect(good.dueAt).toBe(T0 + 3 * DAY_MS);
    expect(good.reps).toBe(1);
  });

  test("bom no vencimento faz o intervalo crescer; fácil cresce mais", () => {
    const first = applyFsrs(card("apple"), 4, T0);
    const due = Date.parse(first.due!);
    const good = applyFsrs(first, 4, due);
    const easy = applyFsrs(first, 5, due);
    expect(good.interval_days).toBeGreaterThan(first.interval_days);
    expect(easy.interval_days).toBeGreaterThan(good.interval_days);
    expect(good.stability!).toBeGreaterThan(first.stability!);
    expect(good.repetition_count).toBe(2);
    expect(good.reviewed_at).toBe(new Date(due).toISOString());
  });

  test("de novo depois de aprender é lapso: estabilidade cai e o cartão volta a aprender", () => {
    let current = applyFsrs(card("bridge"), 4, T0);
    current = applyFsrs(current, 4, Date.parse(current.due!));
    const before = current;
    const lapse = applyFsrs(current, 0, Date.parse(current.due!));
    expect(lapse.status).toBe("learning");
    expect(lapse.stability!).toBeLessThan(before.stability!);
    expect(lapse.interval_days).toBeLessThan(before.interval_days);
    expect(lapse.difficulty!).toBeGreaterThan(before.difficulty!);
  });

  test("lapso muito atrasado nunca deixa o cartão mais estável que antes (FSRS-5)", () => {
    const learned = applyFsrs(card("late"), 3, T0);
    const lapse = applyFsrs(learned, 0, T0 + 200 * DAY_MS);
    expect(lapse.stability!).toBeLessThanOrEqual(learned.stability!);
  });

  test("vencimento, cartão novo e ordenação pelo vencimento", () => {
    const fresh = card("fresh");
    const soon = applyFsrs(card("soon"), 0, T0);
    const later = applyFsrs(card("later"), 4, T0);
    const latest = applyFsrs(card("latest"), 5, T0);
    expect(isNewCard(fresh)).toBe(true);
    expect(isDue(fresh, T0 + 100 * DAY_MS)).toBe(false);
    expect(isDue(later, T0 + 2 * DAY_MS)).toBe(false);
    expect(isDue(later, T0 + 3 * DAY_MS)).toBe(true);

    const queue = dueCards([latest, fresh, later, soon], T0 + 30 * DAY_MS);
    expect(queue.map((item) => item.front_phrase)).toEqual(["soon", "later", "latest"]);
    expect([fresh, soon].sort(compareDue)[0]!.front_phrase).toBe("soon");
  });

  test("retenção estimada: 90% no vencimento, nula para cartão novo", () => {
    const learned = applyFsrs(card("recall"), 4, T0);
    expect(cardRetrievability(card("new"), T0)).toBeNull();
    expect(cardRetrievability(learned, Date.parse(learned.due!))!).toBeCloseTo(0.9, 2);
    expect(cardRetrievability(learned, T0)!).toBeCloseTo(1, 5);
  });

  test("cartão do tempo do SM-2 entra no FSRS vencido, com estabilidade do último intervalo", () => {
    const legacy = card("legacy", { repetition_count: 3, interval_days: 6, status: "reviewing" });
    const seeded = seedFromSm2(legacy, T0);
    expect(seeded.stability).toBe(6);
    expect(isDue(seeded, T0)).toBe(true);
    const next = applyFsrs(seeded, 4, T0);
    expect(next.interval_days).toBeGreaterThan(6);
    expect(seedFromSm2(card("new"), T0)).toEqual(card("new"));
  });
});
