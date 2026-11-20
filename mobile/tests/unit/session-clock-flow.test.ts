import { test, expect } from "@playwright/test";
import {
  SESSION_PHASES,
  SESSION_SECONDS,
  canOpenPhase,
  completePhase,
  createDailyRun,
  frontierPhase,
  nextPhase,
  parseDailyRun,
  phaseCriterionMet,
  phaseSpans,
  phaseStatus,
  ratedTotal,
  ratingBucket,
  recordRating,
  runMatches,
  sessionPhases,
  type DailyRun,
} from "@/lib/session-clock";

const KEY = { date: "2026-11-19", topic: "everyday life", title: "A morning at the market" };
const NONE_LEFT = { reviewLeft: 0 };
const SOME_LEFT = { reviewLeft: 3 };

function fresh(): DailyRun {
  return createDailyRun(KEY);
}

test.describe("sessão sequencial: fronteira e bloqueios", () => {
  test("uma sessão nova começa na revisão e bloqueia todas as outras etapas", () => {
    const run = fresh();
    expect(frontierPhase(run)).toBe("review");
    expect(phaseStatus(run, "review")).toBe("current");
    for (const id of SESSION_PHASES.slice(1)) {
      expect(phaseStatus(run, id), id).toBe("locked");
      expect(canOpenPhase(run, id), id).toBe(false);
    }
  });

  test("etapas concluídas ficam abertas para consulta; a próxima vira a atual", () => {
    let run = fresh();
    run = completePhase(run, "review", NONE_LEFT);
    expect(phaseStatus(run, "review")).toBe("done");
    expect(canOpenPhase(run, "review")).toBe(true);
    expect(phaseStatus(run, "listen")).toBe("current");
    expect(phaseStatus(run, "reading")).toBe("locked");
  });

  test("não conclui a etapa sem cumprir o critério", () => {
    const run = fresh();
    expect(completePhase(run, "review", SOME_LEFT)).toBe(run);
    const listening = completePhase(run, "review", NONE_LEFT);
    expect(completePhase(listening, "listen", NONE_LEFT)).toBe(listening);
  });

  test("não pula etapas: só a fronteira pode ser concluída", () => {
    const run = { ...fresh(), listen: { right: 2, total: 2 } };
    expect(completePhase(run, "listen", NONE_LEFT)).toBe(run);
    expect(frontierPhase(run)).toBe("review");
  });

  test("o percurso inteiro só fecha com cada critério cumprido, em ordem", () => {
    let run = fresh();
    run = completePhase(run, "review", NONE_LEFT);
    run = completePhase({ ...run, listen: { right: 1, total: 2 } }, "listen", NONE_LEFT);
    run = completePhase({ ...run, reading: { tapped: 3, done: true } }, "reading", NONE_LEFT);
    run = completePhase({ ...run, shadow: { best: 82, wpm: null, skipped: false } }, "shadow", NONE_LEFT);
    run = completePhase({ ...run, journal: { score: 74 } }, "journal", NONE_LEFT);
    expect(frontierPhase(run)).toBe("note");
    expect(phaseCriterionMet(run, "note", NONE_LEFT)).toBe(false);
    run = completePhase({ ...run, finished: true }, "note", NONE_LEFT);
    expect(run.completed).toEqual([...SESSION_PHASES]);
    expect(frontierPhase(run)).toBe("note");
  });

  test("critérios: fala aceita nota, fluência ou pular; diário aceita reconstrução", () => {
    const run = fresh();
    expect(phaseCriterionMet(run, "shadow", NONE_LEFT)).toBe(false);
    expect(phaseCriterionMet({ ...run, shadow: { best: null, wpm: 96, skipped: false } }, "shadow", NONE_LEFT)).toBe(true);
    expect(phaseCriterionMet({ ...run, shadow: { best: null, wpm: null, skipped: true } }, "shadow", NONE_LEFT)).toBe(true);
    expect(phaseCriterionMet(run, "journal", NONE_LEFT)).toBe(false);
    expect(phaseCriterionMet({ ...run, rebuild: { score: 60 } }, "journal", NONE_LEFT)).toBe(true);
    expect(phaseCriterionMet(run, "reading", NONE_LEFT)).toBe(false);
    expect(phaseCriterionMet({ ...run, reading: { tapped: 0, done: true } }, "reading", NONE_LEFT)).toBe(true);
  });

  test("nextPhase segue a ordem e termina no fecho", () => {
    expect(nextPhase("review")).toBe("listen");
    expect(nextPhase("journal")).toBe("note");
    expect(nextPhase("note")).toBeNull();
  });
});

test.describe("sessão sequencial: notas dos cartões", () => {
  test("cada cartão conta uma única vez, com a distribuição das notas", () => {
    let run = fresh();
    run = recordRating(run, "Market", 5);
    run = recordRating(run, "market ", 0);
    run = recordRating(run, "stall", 0);
    run = recordRating(run, "price", 3);
    run = recordRating(run, "bargain", 4);
    expect(run.rated).toEqual(["market", "stall", "price", "bargain"]);
    expect(run.ratings).toEqual({ again: 1, hard: 1, good: 1, easy: 1 });
    expect(ratedTotal(run)).toBe(4);
  });

  test("ratingBucket mapeia as notas FSRS", () => {
    expect(ratingBucket(0)).toBe("again");
    expect(ratingBucket(3)).toBe("hard");
    expect(ratingBucket(4)).toBe("good");
    expect(ratingBucket(5)).toBe("easy");
  });
});

test.describe("sessão sequencial: salvar e retomar (F5)", () => {
  test("parseDailyRun devolve o mesmo estado salvo", () => {
    let run = fresh();
    run = recordRating(run, "market", 4);
    run = completePhase(run, "review", NONE_LEFT);
    run = { ...run, elapsed: 312, xp: 11, savedWords: 2, listen: { right: 1, total: 2 } };
    expect(parseDailyRun(JSON.stringify(run))).toEqual(run);
  });

  test("parseDailyRun recusa lixo e limpa campos inválidos", () => {
    expect(parseDailyRun(null)).toBeNull();
    expect(parseDailyRun("{not json")).toBeNull();
    expect(parseDailyRun({ version: 2, date: "x", topic: "y", title: "z" })).toBeNull();
    const parsed = parseDailyRun({
      version: 1,
      date: KEY.date,
      topic: KEY.topic,
      title: KEY.title,
      completed: ["listen", "bogus", "review"],
      ratings: { again: -3, hard: "2" },
      elapsed: Number.NaN,
      shadow: { best: "90" },
    });
    expect(parsed?.completed).toEqual(["review", "listen"]);
    expect(parsed?.ratings).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
    expect(parsed?.elapsed).toBe(0);
    expect(parsed?.shadow).toEqual({ best: null, wpm: null, skipped: false });
  });

  test("runMatches só retoma a mesma data, tema e lição", () => {
    const run = fresh();
    expect(runMatches(run, KEY)).toBe(true);
    expect(runMatches(run, { ...KEY, date: "2026-11-20" })).toBe(false);
    expect(runMatches(run, { ...KEY, title: "Other" })).toBe(false);
    expect(runMatches(null, KEY)).toBe(false);
  });
});

test.describe("plano de tempo", () => {
  test("phaseSpans soma exatamente os 20 minutos", () => {
    for (const dueCount of [0, 3, 12]) {
      const spans = phaseSpans(sessionPhases({ dueCount }));
      const total = Object.values(spans).reduce((sum, value) => sum + value, 0);
      expect(total, `dueCount=${dueCount}`).toBe(SESSION_SECONDS);
      for (const id of SESSION_PHASES) {
        expect(spans[id], id).toBeGreaterThan(0);
      }
    }
  });

  test("mais cartões vencidos dão mais tempo à revisão", () => {
    expect(phaseSpans(sessionPhases({ dueCount: 12 })).review).toBeGreaterThan(phaseSpans(sessionPhases({ dueCount: 0 })).review);
  });
});
