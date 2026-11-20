import { expect, test } from "@playwright/test";
import { DAY_MS, applyFsrs } from "@/lib/fsrs";
import { averageRecall, retentionBand, retentionInput, retentionSnapshot } from "@/lib/retention";
import type { SessionCard } from "@/lib/types";

const T0 = Date.UTC(2026, 10, 1, 12);

function card(phrase: string): SessionCard {
  return {
    id: `c-${phrase}`,
    front_phrase: phrase,
    back_translation: `${phrase} (pt)`,
    context_sentence: `A sentence with ${phrase}.`,
    repetition_count: 0,
    interval_days: 0,
    ease_factor: 2.5,
    status: "learning",
  };
}

test.describe("retenção", () => {
  test("sem cartões não há porcentagem inventada", () => {
    expect(retentionSnapshot([]).score).toBe(0);
    expect(averageRecall([], T0)).toBeNull();
    expect(averageRecall([card("new")], T0)).toBeNull();
  });

  test("faixas pela estabilidade FSRS e pelo vencimento", () => {
    expect(retentionBand({ phrase: "a", intervalDays: 0, status: "learning" })).toBe("critical");
    expect(retentionBand({ phrase: "b", intervalDays: 3, status: "reviewing", stability: 3.2 })).toBe("decaying");
    expect(retentionBand({ phrase: "c", intervalDays: 11, status: "reviewing", stability: 10.7 })).toBe("settling");
    expect(retentionBand({ phrase: "d", intervalDays: 30, status: "mastered", stability: 30 })).toBe("fixed");
    expect(retentionBand({ phrase: "e", intervalDays: 30, status: "mastered", stability: 30, due: true })).toBe("critical");
  });

  test("retentionInput calcula o vencimento do cartão", () => {
    const learned = applyFsrs(card("apple"), 4, T0);
    expect(retentionInput(learned, T0 + DAY_MS).due).toBe(false);
    expect(retentionInput(learned, T0 + 4 * DAY_MS).due).toBe(true);
    expect(retentionInput(learned, T0).stability).toBeCloseTo(3.173, 3);

    const snapshot = retentionSnapshot([
      retentionInput(applyFsrs(card("x"), 5, T0), T0),
      retentionInput(applyFsrs(applyFsrs(card("y"), 5, T0), 5, T0 + 16 * DAY_MS), T0 + 16 * DAY_MS),
    ]);
    expect(snapshot.mastered).toBe(1);
    expect(snapshot.score).toBe(50);
  });

  test("lembrança média estimada pelo FSRS", () => {
    const learned = applyFsrs(card("apple"), 4, T0);
    expect(averageRecall([learned, card("new")], Date.parse(learned.due!))!).toBeCloseTo(0.9, 2);
  });
});
