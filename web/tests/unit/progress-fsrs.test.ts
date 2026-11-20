import { expect, test } from "@playwright/test";
import { DAY_MS, applyFsrs } from "@/lib/fsrs";
import { kv } from "@/lib/kv";
import {
  bindProgressLang,
  cardXpKey,
  clearLocalProgress,
  dueQueue,
  enqueueReview,
  flushProgressDebounce,
  getProgress,
  hydrateProgress,
  isoDate,
  laneStats,
  mergeServerCards,
  persistDeck,
  reviewCard,
  reviewQueue,
  switchProgressLang,
} from "@/lib/progress";
import type { SessionCard } from "@/lib/types";
import { awardXp, getXpState } from "@/lib/xp";

const T0 = new Date(2026, 10, 2, 9, 0, 0).getTime();

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

function stored(phrase: string): SessionCard {
  const found = getProgress().cards.find((item) => item.front_phrase === phrase);
  if (!found) {
    throw new Error(`card ${phrase} not stored`);
  }
  return found;
}

test.describe("progress: revisão FSRS", () => {
  test.beforeEach(() => {
    clearLocalProgress();
    bindProgressLang("en");
  });

  test.afterEach(() => {
    clearLocalProgress();
  });

  test("reviewCard agenda com FSRS, grava os campos e enfileira a sincronização", () => {
    persistDeck([card("apple"), card("bread")]);
    const graded = reviewCard(card("apple"), 4, T0);
    const saved = stored("apple");
    expect(saved.stability).toBeCloseTo(3.173, 3);
    expect(saved.difficulty).toBeGreaterThan(0);
    expect(saved.due).toBe(new Date(T0 + 3 * DAY_MS).toISOString());
    expect(saved.reviewed_at).toBe(new Date(T0).toISOString());
    expect(saved.repetition_count).toBe(1);
    expect(graded).toEqual(saved);
    const pending = getProgress().pendingReviews;
    expect(pending).toHaveLength(1);
    expect(pending[0]!.front_phrase).toBe("apple");
    expect(pending[0]!.quality).toBe(4);
    expect(pending[0]!.client_id).toMatch(/^[a-zA-Z0-9_-]{8,80}$/);
  });

  test("bom/fácil no vencimento alongam o intervalo; de novo é lapso", () => {
    persistDeck([card("bridge")]);
    reviewCard(card("bridge"), 4, T0);
    const first = stored("bridge");
    reviewCard(first, 4, Date.parse(first.due!));
    const second = stored("bridge");
    expect(second.interval_days).toBeGreaterThan(first.interval_days);
    reviewCard(second, 5, Date.parse(second.due!));
    const third = stored("bridge");
    expect(third.interval_days).toBeGreaterThan(second.interval_days);
    reviewCard(third, 0, Date.parse(third.due!));
    const lapse = stored("bridge");
    expect(lapse.status).toBe("learning");
    expect(lapse.stability!).toBeLessThan(third.stability!);
    expect(lapse.interval_days).toBeLessThan(third.interval_days);
    expect(lapse.repetition_count).toBe(4);
  });

  test("a fila de vencidos sai ordenada pelo vencimento, o mais atrasado primeiro", () => {
    persistDeck([card("good"), card("hard"), card("again"), card("easy"), card("untouched")]);
    reviewCard(card("good"), 4, T0);
    reviewCard(card("hard"), 3, T0);
    reviewCard(card("again"), 0, T0);
    reviewCard(card("easy"), 5, T0);
    expect(dueQueue(T0 + 4 * DAY_MS).map((item) => item.front_phrase)).toEqual(["again", "hard", "good"]);
    expect(dueQueue(T0 + 2 * DAY_MS).map((item) => item.front_phrase)).toEqual(["again", "hard"]);
    expect(laneStats("en").words).toBe(5);

    const lesson = [card("lesson-1"), card("good")];
    const queue = reviewQueue(lesson, getProgress().cards, T0 + 4 * DAY_MS);
    // vencidos (por vencimento), depois um nunca revisado, depois a lição (com o "good" gravado).
    expect(queue.map((item) => item.front_phrase)).toEqual(["again", "hard", "untouched", "lesson-1", "good"]);
    expect(queue[4]!.repetition_count).toBe(1);
  });

  test("a mesma nota já gravada pelo chamador não é aplicada duas vezes", () => {
    const original = card("twice");
    persistDeck([original]);
    const fromStage = applyFsrs(original, 4, T0);
    persistDeck([fromStage]);
    reviewCard(original, 4, T0 + 50);
    expect(stored("twice").repetition_count).toBe(1);
    expect(getProgress().pendingReviews).toHaveLength(1);
  });

  test("uma cópia antiga do deck não apaga uma revisão mais nova", () => {
    const original = card("stale");
    persistDeck([original]);
    reviewCard(original, 4, T0);
    persistDeck([original]);
    expect(stored("stale").repetition_count).toBe(1);
    expect(stored("stale").stability).toBeCloseTo(3.173, 3);
  });

  test("cartão do servidor não desfaz revisão local que ainda não subiu", () => {
    const local = applyFsrs(applyFsrs(card("sync"), 4, T0), 4, T0 + 3 * DAY_MS);
    const remote = { ...applyFsrs(card("sync"), 4, T0), id: "server-uuid" };
    const merged = mergeServerCards([local], [remote]);
    expect(merged[0]!.id).toBe("server-uuid");
    expect(merged[0]!.repetition_count).toBe(2);
    expect(merged[0]!.due).toBe(local.due);
    const caughtUp = mergeServerCards([remote], [{ ...local, id: "server-uuid" }]);
    expect(caughtUp[0]!.due).toBe(local.due);
  });

  test("XP do cartão: 1 por cartão por dia, sem pagar a mesma revisão duas vezes", () => {
    persistDeck([card("xp-a"), card("xp-b")]);
    reviewCard(card("xp-a"), 0, T0);
    reviewCard(stored("xp-a"), 4, T0 + 60_000);
    reviewCard(card("xp-b"), 4, T0 + 120_000);
    expect(getXpState().log[isoDate(new Date(T0))]).toBe(2);
  });

  test("caminho do SrsStage (persistDeck + enqueueReview) enfileira sem pagar; o XP vem do awardXp do chamador", () => {
    const original = card("stage");
    persistDeck([original]);
    const graded = applyFsrs(original, 4, Date.now());
    persistDeck([graded]);
    enqueueReview(original, 4);
    expect(getXpState().log[isoDate()]).toBeUndefined();
    expect(getProgress().pendingReviews).toHaveLength(1);
    expect(awardXp("card", cardXpKey(original))).toBe(1);
    // reviewCard depois, no mesmo dia, não paga o mesmo cartão de novo.
    reviewCard(stored("stage"), 5);
    expect(getXpState().log[isoDate()]).toBe(1);
  });

  test("cada idioma tem a sua faixa e tudo sobrevive ao F5", () => {
    persistDeck([card("hello")]);
    reviewCard(card("hello"), 4, T0);
    switchProgressLang("es");
    expect(getProgress().cards).toHaveLength(0);
    persistDeck([card("hola")]);
    switchProgressLang("en");
    expect(getProgress().cards.map((item) => item.front_phrase)).toEqual(["hello"]);

    flushProgressDebounce();
    const raw = kv.getString("prosa.progress.v1");
    expect(raw).toBeDefined();
    const bag = JSON.parse(raw!);
    expect(bag.version).toBe(3);
    expect(Object.keys(bag.lanes).sort()).toEqual(["en", "es"]);

    hydrateProgress();
    expect(getProgress().cards).toHaveLength(1);
    expect(stored("hello").stability).toBeCloseTo(3.173, 3);
    expect(stored("hello").due).toBe(new Date(T0 + 3 * DAY_MS).toISOString());
    switchProgressLang("es");
    expect(getProgress().cards.map((item) => item.front_phrase)).toEqual(["hola"]);
  });

  test("formato v2 (SM-2, ofensiva global com congelamento) migra sem inventar dias", () => {
    clearLocalProgress();
    kv.set(
      "prosa.progress.v1",
      JSON.stringify({
        version: 2,
        pro: true,
        streakCount: 9,
        lastLessonDate: "2026-10-30",
        streakFreezeCount: 2,
        activeLang: "de",
        lanes: {
          de: {
            cards: [card("Haus", { repetition_count: 2, interval_days: 6, status: "reviewing" })],
            pendingReviews: [],
            history: [],
            badges: [],
          },
        },
      }),
    );
    hydrateProgress();
    const state = getProgress();
    expect(state.pro).toBe(true);
    expect(state.sessionDays).toEqual(["2026-10-30"]);
    expect(state.bestStreak).toBe(9);
    expect(state.streakFreezeCount).toBe(0);
    const haus = state.cards[0]!;
    expect(haus.stability).toBe(6);
    expect(haus.due).toBeDefined();
    expect(dueQueue(Date.now() + 1000).map((item) => item.front_phrase)).toEqual(["Haus"]);
  });
});
