import { test, expect } from "@playwright/test";
import {
  bandStatus,
  completedToday,
  longDate,
  newestFirst,
  nextLevel,
  rulerSeconds,
  sessionStatus,
  shortDate,
  weekdayShort,
  xpFraction,
} from "@/features/home/model/home-model";
import { SESSION_SECONDS, sessionPhases } from "@/lib/session-clock";

const TODAY = "2026-11-19";

test.describe("Hoje: estado da sessão a partir do que o aparelho guardou", () => {
  test("nada de hoje: começar", () => {
    expect(sessionStatus({ today: TODAY, sessionDoneToday: false, run: null, lessonDate: null })).toBe("start");
    expect(sessionStatus({ today: TODAY, sessionDoneToday: false, run: { date: "2026-11-18", completed: ["review"], elapsed: 300, finished: false }, lessonDate: "2026-11-18" })).toBe("start");
  });

  test("progresso de hoje ou lição de hoje gerada: continuar", () => {
    expect(sessionStatus({ today: TODAY, sessionDoneToday: false, run: { date: TODAY, completed: ["review"], elapsed: 0, finished: false }, lessonDate: null })).toBe("continue");
    expect(sessionStatus({ today: TODAY, sessionDoneToday: false, run: { date: TODAY, completed: [], elapsed: 42, finished: false }, lessonDate: null })).toBe("continue");
    expect(sessionStatus({ today: TODAY, sessionDoneToday: false, run: null, lessonDate: TODAY })).toBe("continue");
  });

  test("sessão completa (ofensiva ou progresso salvo terminado): feita", () => {
    expect(sessionStatus({ today: TODAY, sessionDoneToday: true, run: null, lessonDate: null })).toBe("done");
    expect(sessionStatus({ today: TODAY, sessionDoneToday: false, run: { date: TODAY, completed: [], elapsed: 0, finished: true }, lessonDate: null })).toBe("done");
  });

  test("etapas de hoje só valem do progresso salvo de hoje", () => {
    expect(completedToday({ date: TODAY, completed: ["review", "listen"], elapsed: 0, finished: false }, TODAY)).toEqual(["review", "listen"]);
    expect(completedToday({ date: "2026-11-18", completed: ["review"], elapsed: 0, finished: false }, TODAY)).toEqual([]);
    expect(completedToday(null, TODAY)).toEqual([]);
  });

  test("régua: início da primeira etapa não feita; cheia quando feita; vazia sem nada", () => {
    const phases = sessionPhases({ dueCount: 0 });
    expect(rulerSeconds(phases, [], "start")).toBe(0);
    expect(rulerSeconds(phases, ["review"], "continue")).toBe(phases[1]!.start);
    expect(rulerSeconds(phases, ["review", "listen", "reading"], "continue")).toBe(phases[3]!.start);
    expect(rulerSeconds(phases, [], "done")).toBe(SESSION_SECONDS);
  });
});

test.describe("Hoje e Trilha: nível, XP e datas", () => {
  test("próxima faixa CEFR", () => {
    expect(nextLevel("A1")).toBe("A2");
    expect(nextLevel("b1")).toBe("B2");
    expect(nextLevel("C1")).toBe("C2");
    expect(nextLevel("C2")).toBeNull();
    expect(nextLevel("??")).toBeNull();
  });

  test("fração da meta de XP fica entre 0 e 1", () => {
    expect(xpFraction(0, 50)).toBe(0);
    expect(xpFraction(25, 50)).toBe(0.5);
    expect(xpFraction(80, 50)).toBe(1);
    expect(xpFraction(10, 0)).toBe(0);
  });

  test("situação de cada faixa diante do nível atual", () => {
    expect(bandStatus("A1", "B1")).toBe("below");
    expect(bandStatus("B1", "B1")).toBe("current");
    expect(bandStatus("C2", "B1")).toBe("locked");
    expect(bandStatus("A1", "")).toBe("current");
    expect(bandStatus("A2", "")).toBe("locked");
  });

  test("histórico do mais recente para o mais antigo, sem mudar a lista original", () => {
    const list = [
      { id: "1", finished_at: "2026-10-01T10:00:00.000Z" },
      { id: "2", finished_at: "2026-11-01T10:00:00.000Z" },
    ];
    expect(newestFirst(list).map((item) => item.id)).toEqual(["2", "1"]);
    expect(list[0]!.id).toBe("1");
  });

  test("datas no idioma da interface", () => {
    expect(weekdayShort("2026-11-19", "en")).toBe("Thu");
    expect(longDate("2026-11-19", "en")).toBe("Thursday, November 19");
    expect(longDate("2026-11-19", "pt-BR")).toContain("19 de novembro");
    expect(shortDate("2026-11-19T12:00:00.000Z", "en")).toBe("Nov 19, 2026");
    expect(shortDate("não é data", "en")).toBe("não é data");
  });
});
