import { expect, test } from "@playwright/test";
import { DAY_MS, applyFsrs } from "@/lib/fsrs";
import {
  bindProgressLang,
  clearLocalProgress,
  getProgress,
  markSessionComplete,
  persistDeck,
  recordStudyTime,
  rememberLesson,
  reviewCard,
  type ProgressState,
} from "@/lib/progress";
import { computeToday } from "@/lib/today";
import { getXpState } from "@/lib/xp";
import { createEmptyXpState, type XpState } from "@/lib/xp-rules";
import type { LessonPayload, SessionCard } from "@/lib/types";

const NOW = new Date(2026, 10, 19, 15, 0, 0);
const TODAY = "2026-11-19";

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

function lesson(title: string): LessonPayload {
  return { title, story_text: "Story.", translation: "História.", vocabulary: [], journal_prompt: "Write." };
}

function emptyState(): ProgressState {
  clearLocalProgress();
  return getProgress();
}

test.describe("useToday: agregação pura (computeToday)", () => {
  test.afterEach(() => {
    clearLocalProgress();
  });

  test("estado vazio: tudo zero, sem lição inventada", () => {
    const today = computeToday(emptyState(), createEmptyXpState(), NOW);
    expect(today).toEqual({
      today: TODAY,
      dueCount: 0,
      newCount: 0,
      cardCount: 0,
      sessionDoneToday: false,
      minutesToday: 0,
      streak: 0,
      bestStreak: 0,
      week: [false, false, false, false, false, false, false],
      weekDays: ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"],
      xpToday: 0,
      xpGoal: 50,
      pendingSync: 0,
    });
    expect(today.lastLessonTitle).toBeUndefined();
  });

  test("agrega cartões, ofensiva, tempo, XP e a última lição", () => {
    const at = NOW.getTime();
    const progress: ProgressState = {
      ...emptyState(),
      cards: [
        applyFsrs(card("overdue"), 4, at - 5 * DAY_MS),
        applyFsrs(card("due-now"), 0, at - DAY_MS),
        applyFsrs(card("future"), 5, at),
        card("new-1"),
        card("new-2"),
      ],
      sessionDays: ["2026-11-16", "2026-11-17", "2026-11-18", TODAY],
      bestStreak: 6,
      studyLog: { [TODAY]: { daily: 1260, news: 130 }, "2026-11-18": { daily: 1200 } },
      history: [
        { date: "2026-11-17", title: "Old", topic: "coffee", lesson: lesson("Old") },
        { date: "2026-11-18", title: "Market day", topic: "food", lesson: lesson("Market day") },
      ],
      pendingReviews: [
        { client_id: "rev_abcdefgh", front_phrase: "x", back_translation: "y", context_sentence: "z", quality: 4 },
      ],
    };
    const xp: XpState = { ...createEmptyXpState(20), log: { [TODAY]: 35, "2026-11-18": 60 } };
    const today = computeToday(progress, xp, NOW);
    expect(today.dueCount).toBe(2);
    expect(today.newCount).toBe(2);
    expect(today.cardCount).toBe(5);
    expect(today.sessionDoneToday).toBe(true);
    expect(today.minutesToday).toBe(23);
    expect(today.streak).toBe(4);
    expect(today.bestStreak).toBe(6);
    expect(today.week).toEqual([false, false, false, true, true, true, true]);
    expect(today.xpToday).toBe(35);
    expect(today.xpGoal).toBe(20);
    expect(today.pendingSync).toBe(1);
    expect(today.lastLessonTitle).toBe("Market day");
    expect(today.lastLessonDate).toBe("2026-11-18");
    expect(today.lastSessionDate).toBe(TODAY);
  });

  test("sem sessão hoje: ofensiva de ontem segue, e cai a zero depois de um dia vazio", () => {
    const progress: ProgressState = { ...emptyState(), sessionDays: ["2026-11-17", "2026-11-18"] };
    const today = computeToday(progress, createEmptyXpState(), NOW);
    expect(today.sessionDoneToday).toBe(false);
    expect(today.streak).toBe(2);
    expect(computeToday(progress, createEmptyXpState(), new Date(2026, 10, 20, 9)).streak).toBe(0);
  });
});

test.describe("useToday: a partir das ações reais do store", () => {
  test.beforeEach(() => {
    clearLocalProgress();
    bindProgressLang("en");
  });

  test.afterEach(() => {
    clearLocalProgress();
  });

  test("revisão, tempo de estudo e sessão completa aparecem no resumo do dia", () => {
    const now = Date.now();
    persistDeck([card("one"), card("two")]);
    reviewCard(card("one"), 4, now);
    recordStudyTime(300, { key: "daily" });
    recordStudyTime(600, { key: "daily" });
    recordStudyTime(400, { key: "daily" });
    recordStudyTime(90);
    markSessionComplete();
    rememberLesson(TODAY, "food", lesson("Market day"), []);

    const today = computeToday(getProgress(), getXpState(), new Date(now));
    expect(today.minutesToday).toBe(11);
    expect(today.sessionDoneToday).toBe(true);
    expect(today.streak).toBe(1);
    expect(today.newCount).toBe(1);
    expect(today.dueCount).toBe(0);
    expect(today.xpToday).toBe(1);
    expect(today.lastLessonTitle).toBe("Market day");
  });
});
