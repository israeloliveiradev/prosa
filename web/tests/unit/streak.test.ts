import { expect, test } from "@playwright/test";
import {
  applyRemoteFreeze,
  bestStreakFromDays,
  bindProgressLang,
  clearLocalProgress,
  flushProgressDebounce,
  getProgress,
  hydrateProgress,
  isoDate,
  markSessionComplete,
  nextStreak,
  streakFromDays,
  streakSummary,
  switchProgressLang,
  weekFromDays,
} from "@/lib/progress";

test.describe("ofensiva honesta: funções puras com datas fixas", () => {
  test("dias seguidos terminando hoje", () => {
    expect(streakFromDays(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"], "2026-11-19")).toBe(4);
  });

  test("a sessão de hoje ainda não aconteceu: a ofensiva de ontem continua de pé", () => {
    expect(streakFromDays(["2026-11-17", "2026-11-18"], "2026-11-19")).toBe(2);
  });

  test("um dia inteiro sem sessão zera a contagem, sem outra penalidade", () => {
    expect(streakFromDays(["2026-11-16", "2026-11-17"], "2026-11-19")).toBe(0);
    expect(streakFromDays(["2026-11-14", "2026-11-15", "2026-11-17", "2026-11-18"], "2026-11-18")).toBe(2);
    expect(streakFromDays([], "2026-11-19")).toBe(0);
  });

  test("atravessa a virada de mês e de ano", () => {
    expect(streakFromDays(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01")).toBe(3);
    expect(streakFromDays(["2026-12-31", "2027-01-01"], "2027-01-01")).toBe(2);
  });

  test("melhor ofensiva é a maior sequência da história", () => {
    expect(bestStreakFromDays(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-10", "2026-11-11"])).toBe(5);
    expect(bestStreakFromDays(["2026-11-05", "2026-11-01", "2026-11-05", "2026-11-02"])).toBe(2);
    expect(bestStreakFromDays([])).toBe(0);
  });

  test("últimos 7 dias, do mais antigo para hoje", () => {
    expect(weekFromDays(["2026-11-13", "2026-11-15", "2026-11-19", "2026-11-01"], "2026-11-19")).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
    const summary = streakSummary(["2026-11-18", "2026-11-19"], "2026-11-19", 6);
    expect(summary).toEqual({
      current: 2,
      best: 6,
      doneToday: true,
      week: [false, false, false, false, false, true, true],
      weekDays: ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"],
      lastDay: "2026-11-19",
    });
  });

  test("nextStreak (compatibilidade) não tem congelamento", () => {
    const base = { streakCount: 5, lastLessonDate: "2026-11-17", streakFreezeCount: 3 };
    expect(nextStreak(base, "2026-11-18")).toEqual({ streakCount: 6, lastLessonDate: "2026-11-18", streakFreezeCount: 0 });
    expect(nextStreak(base, "2026-11-19")).toEqual({ streakCount: 1, lastLessonDate: "2026-11-19", streakFreezeCount: 0 });
    expect(nextStreak(base, "2026-11-17").streakCount).toBe(5);
  });
});

test.describe("ofensiva honesta: markSessionComplete", () => {
  test.beforeEach(() => {
    clearLocalProgress();
    bindProgressLang("en");
  });

  test.afterEach(() => {
    clearLocalProgress();
  });

  test("dias com sessão completa formam a ofensiva; repetir o dia não soma", () => {
    markSessionComplete("2026-11-16");
    markSessionComplete("2026-11-17");
    markSessionComplete("2026-11-17");
    markSessionComplete("2026-11-18");
    const state = getProgress();
    expect(state.sessionDays).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(state.bestStreak).toBe(3);
    expect(state.badges).toEqual(expect.arrayContaining(["first_flame", "streak_3"]));
    expect(state.badges).not.toContain("streak_7");
    expect(streakSummary(state.sessionDays, "2026-11-19", state.bestStreak).current).toBe(3);
    expect(streakSummary(state.sessionDays, "2026-11-20", state.bestStreak).current).toBe(0);
    expect(streakSummary(state.sessionDays, "2026-11-20", state.bestStreak).best).toBe(3);
  });

  test("a ofensiva do estado é calculada para hoje; congelamento não existe", () => {
    markSessionComplete();
    const state = getProgress();
    expect(state.streakCount).toBe(1);
    expect(state.lastLessonDate).toBe(isoDate());
    applyRemoteFreeze(5);
    expect(getProgress().streakFreezeCount).toBe(0);
    expect(getProgress().streakCount).toBe(1);
  });

  test("a ofensiva é de cada curso e sobrevive ao F5", () => {
    markSessionComplete("2026-11-18");
    markSessionComplete("2026-11-19");
    switchProgressLang("ja");
    expect(getProgress().sessionDays).toEqual([]);
    markSessionComplete("2026-11-19");
    flushProgressDebounce();
    hydrateProgress();
    expect(getProgress().sessionDays).toEqual(["2026-11-19"]);
    switchProgressLang("en");
    expect(getProgress().sessionDays).toEqual(["2026-11-18", "2026-11-19"]);
  });

  test("datas inválidas são ignoradas", () => {
    markSessionComplete("19/11/2026");
    expect(getProgress().sessionDays).toEqual([]);
  });
});
