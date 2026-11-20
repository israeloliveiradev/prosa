import { test, expect } from "@playwright/test";
import { applyAnswer, EMPTY_TALLY, parseDuelRound, unitParam } from "@/features/practice/model/duel-model";
import { cleanTypedSentence, filterCards, filterCounts, hubStats, pickSentences, splitSentences } from "@/features/practice/model/practice-model";
import { parseScenesResponse } from "@/features/practice/model/scenes";
import type { SessionCard } from "@/lib/types";

const NOW = Date.parse("2026-11-20T12:00:00Z");

function card(over: Partial<SessionCard>): SessionCard {
  return {
    id: "c",
    front_phrase: "Haus",
    back_translation: "casa",
    context_sentence: "Das Haus ist alt.",
    repetition_count: 1,
    interval_days: 1,
    ease_factor: 2.5,
    status: "learning",
    ...over,
  };
}

test("hubStats: sem cartões não há número; vencidos e melhor do duelo são reais", () => {
  expect(hubStats([], null, NOW)).toEqual({ due: null, duelBest: null });
  const cards = [card({ id: "a", due: "2026-11-19T00:00:00Z" }), card({ id: "b", due: "2026-12-01T00:00:00Z" })];
  expect(hubStats(cards, 120, NOW)).toEqual({ due: 1, duelBest: 120 });
  expect(hubStats(cards, 0, NOW).duelBest).toBeNull();
});

test("filtros da revisão separam vencidos, aprendendo e dominados", () => {
  const cards = [
    card({ id: "a", due: "2026-11-19T00:00:00Z" }),
    card({ id: "b", due: "2026-12-01T00:00:00Z" }),
    card({ id: "c", status: "mastered", due: "2026-11-01T00:00:00Z" }),
  ];
  expect(filterCards(cards, "due", NOW).map((item) => item.id)).toEqual(["a"]);
  expect(filterCards(cards, "learning", NOW).map((item) => item.id)).toEqual(["a", "b"]);
  expect(filterCards(cards, "mastered", NOW).map((item) => item.id)).toEqual(["c"]);
  expect(filterCounts(cards, NOW)).toEqual({ due: 1, learning: 2, mastered: 1 });
});

test("splitSentences descarta fragmentos curtos e frases enormes", () => {
  expect(splitSentences("Oi. Ich gehe heute in die Schule. Wie geht es dir heute?")).toEqual([
    "Ich gehe heute in die Schule.",
    "Wie geht es dir heute?",
  ]);
  expect(splitSentences(`${"a".repeat(200)}.`)).toEqual([]);
});

test("pickSentences: lições primeiro, senão a gramática da unidade, senão nada", () => {
  const lessons = [{ lesson: { story_text: "Ich lerne jeden Tag Deutsch. Das macht mir Spaß.", vocabulary: [{ example_sentence: "Ich lerne jeden Tag Deutsch." }] } }];
  const fromLessons = pickSentences(lessons, null);
  expect(fromLessons.origin).toBe("lessons");
  expect(fromLessons.sentences).toEqual(["Ich lerne jeden Tag Deutsch.", "Das macht mir Spaß."]);

  const path = {
    current_unit_id: "a1-01",
    units: [{ id: "a1-01", grammar: { name: "sein", examples: ["Ich bin müde.", "Du bist hier."] } }],
  } as never;
  expect(pickSentences([], path)).toEqual({ sentences: ["Ich bin müde.", "Du bist hier."], origin: "unit" });
  expect(pickSentences([], null)).toEqual({ sentences: [], origin: "none" });
});

test("cleanTypedSentence apara e limita a 240 caracteres", () => {
  expect(cleanTypedSentence("  Ich   bin  hier \n")).toBe("Ich bin hier");
  expect(cleanTypedSentence("x".repeat(300))).toHaveLength(240);
});

test("parseScenesResponse descarta cenas malformadas e trata fonte desconhecida como fallback", () => {
  const good = {
    id: "s1",
    kind: "goal",
    title: "No café",
    setting: "Um café em Berlim",
    learner_role: "Cliente",
    partner_role: "Garçom",
    objective: "Pedir um café",
    twist: null,
    unit_id: null,
  };
  const parsed = parseScenesResponse({ scenes: [good, { ...good, id: "s2", kind: "other" }, { ...good, id: "" }, null], source: "ai" });
  expect(parsed.source).toBe("ai");
  expect(parsed.scenes.map((scene) => scene.id)).toEqual(["s1"]);
  expect(parseScenesResponse({ scenes: [good] }).source).toBe("fallback");
  expect(parseScenesResponse(null)).toEqual({ scenes: [], source: "fallback" });
});

test("parseDuelRound valida perguntas, melhor pessoal e eco da unidade", () => {
  const drill = (n: number) => ({ prompt: `Pergunta ${n}`, options: ["a", "b", "c", "d"], answer: n % 4 });
  const drills = Array.from({ length: 8 }, (_, n) => drill(n));
  const round = parseDuelRound({ drills, focus: ["verbos", " "], unit_id: "a1-01", best: 90 });
  expect(round.drills).toHaveLength(8);
  expect(round.focus).toEqual(["verbos"]);
  expect(round.unit_id).toBe("a1-01");
  expect(round.best).toBe(90);
  expect(parseDuelRound({ drills }).best).toBeNull();
  expect(() => parseDuelRound({ drills: drills.slice(0, 5) })).toThrow();
});

test("applyAnswer: combo sobe, erro zera e o placar respeita o teto do servidor", () => {
  let tally = EMPTY_TALLY;
  for (const right of [true, true, false, true]) {
    tally = applyAnswer(tally, right);
  }
  expect(tally).toEqual({ score: 10 + 20 + 10, combo: 1, bestCombo: 2, correct: 3, answered: 4 });
  expect(tally.score).toBeLessThanOrEqual(5 * tally.correct * (tally.correct + 1));
});

test("unitParam aceita só ids da trilha", () => {
  expect(unitParam("a1-01")).toBe("a1-01");
  expect(unitParam(["B2-03"])).toBe("b2-03");
  expect(unitParam("x1-01")).toBeNull();
  expect(unitParam(undefined)).toBeNull();
});
