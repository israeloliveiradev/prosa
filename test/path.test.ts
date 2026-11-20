import assert from "node:assert/strict";
import test from "node:test";
import type { LanguageUnit } from "../src/curriculum/types.ts";
import { pathFinishBodySchema, sessionCompleteBodySchema, unitParamsSchema } from "../src/schemas/path.ts";
import { journalCountsForPath } from "../src/services/journal-service.ts";
import {
  missingUnitLemmas,
  personalizationLines,
  personalizationStamp,
  unitCacheSuffix,
  unitPromptLines,
} from "../src/services/lesson-service.ts";
import {
  acceptAiDrills,
  addDays,
  blankLemma,
  CardIndex,
  cardMatchesLemma,
  composeUnitTest,
  fallbackTestItems,
  initialStatuses,
  lemmaInText,
  lessonFocusLemmas,
  masterUnit,
  masteryOf,
  nextLevel,
  normalizePhrase,
  publicUnitItems,
  raiseToLevel,
  scoreAnswers,
  sessionDateAccepted,
  streakBroken,
  streakFrom,
  utcDay,
  type UnitStatus,
} from "../src/services/path-service.ts";

function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function apply(current: Map<string, UnitStatus>, changes: Array<{ unit_id: string; to: UnitStatus }>): Map<string, UnitStatus> {
  const next = new Map(current);
  for (const change of changes) {
    next.set(change.unit_id, change.to);
  }
  return next;
}

function count(statuses: Map<string, UnitStatus>, status: UnitStatus): number {
  return [...statuses.values()].filter((value) => value === status).length;
}

const UNIT: LanguageUnit = {
  grammar: {
    name: "Present Simple: be",
    summary: "Using be to say your name and where you are from.",
    examples: ["Hello, my name is Ana.", "Where are you from?"],
  },
  lemmas: [
    { lemma: "hello", gloss: "a greeting" },
    { lemma: "goodbye", gloss: "said when leaving" },
    { lemma: "name", gloss: "what you are called" },
    { lemma: "from", gloss: "origin" },
    { lemma: "country", gloss: "a nation" },
    { lemma: "city", gloss: "a large town" },
    { lemma: "meet", gloss: "see someone for the first time" },
    { lemma: "nice", gloss: "pleasant" },
    { lemma: "live", gloss: "have your home somewhere" },
    { lemma: "friend", gloss: "a person you like" },
    { lemma: "thank you", gloss: "words of gratitude" },
    { lemma: "please", gloss: "polite request word" },
  ],
};

test("path statuses", async (t) => {
  await t.test("a new A1 path: a1-01 active, everything else locked", () => {
    const statuses = initialStatuses("A1");
    assert.equal(statuses.size, 32);
    assert.equal(statuses.get("a1-01"), "active");
    assert.equal(count(statuses, "active"), 1);
    assert.equal(count(statuses, "locked"), 31);
  });

  await t.test("a new B1 path validates A1 and A2 and opens b1-01", () => {
    const statuses = initialStatuses("B1");
    assert.equal(count(statuses, "validated"), 16);
    assert.equal(statuses.get("a2-08"), "validated");
    assert.equal(statuses.get("b1-01"), "active");
    assert.equal(statuses.get("b1-02"), "locked");
  });

  await t.test("C2 starts at the end of the trail (c1-01)", () => {
    const statuses = initialStatuses("C2");
    assert.equal(statuses.get("c1-01"), "active");
    assert.equal(count(statuses, "validated"), 29);
  });

  await t.test("a higher placement validates lower bands, keeps mastered units and advances the active one", () => {
    let statuses = initialStatuses("A1");
    statuses = apply(statuses, [
      { unit_id: "a1-01", to: "mastered" },
      { unit_id: "a1-02", to: "mastered" },
      { unit_id: "a1-03", to: "active" },
    ]);
    const changes = raiseToLevel(statuses, "B1");
    const next = apply(statuses, changes);
    assert.equal(next.get("a1-01"), "mastered");
    assert.equal(next.get("a1-02"), "mastered");
    assert.equal(next.get("a1-03"), "validated");
    assert.equal(next.get("a2-08"), "validated");
    assert.equal(next.get("b1-01"), "active");
    assert.equal(count(next, "active"), 1);
    const demoted = changes.findIndex((change) => change.unit_id === "a1-03");
    const promoted = changes.findIndex((change) => change.unit_id === "b1-01");
    assert.ok(demoted < promoted, "the old active unit leaves before the new one enters (unique active index)");
  });

  await t.test("a lower or equal level never re-locks anything", () => {
    let statuses = initialStatuses("B1");
    statuses = apply(statuses, [
      { unit_id: "b1-01", to: "mastered" },
      { unit_id: "b1-02", to: "active" },
    ]);
    assert.deepEqual(raiseToLevel(statuses, "A1"), []);
    assert.deepEqual(raiseToLevel(statuses, "B1"), []);
  });

  await t.test("mastering a unit opens the next one, also across bands", () => {
    let statuses = initialStatuses("A1");
    statuses = apply(statuses, [
      { unit_id: "a1-01", to: "validated" },
      { unit_id: "a1-08", to: "active" },
    ]);
    statuses.set("a1-01", "active");
    statuses.set("a1-08", "locked");
    const first = masterUnit(statuses, "a1-01");
    assert.equal(first.nextUnitId, "a1-02");
    const second = apply(statuses, first.changes);
    assert.equal(second.get("a1-01"), "mastered");
    assert.equal(second.get("a1-02"), "active");
    const end = new Map(second);
    for (const id of ["a1-02", "a1-03", "a1-04", "a1-05", "a1-06", "a1-07"]) {
      end.set(id, "mastered");
    }
    end.set("a1-08", "active");
    const crossed = masterUnit(end, "a1-08");
    assert.equal(crossed.nextUnitId, "a2-01");
  });

  await t.test("only the active unit can be mastered", () => {
    const statuses = initialStatuses("A1");
    assert.deepEqual(masterUnit(statuses, "a1-02"), { changes: [], nextUnitId: null });
  });
});

test("unit mastery", async (t) => {
  await t.test("matches the contract example (12 lemmas -> 10 required)", () => {
    const mastery = masteryOf({ status: "active", lessonsDone: 1, lemmasKnown: 4, lemmasTotal: 12, journalMet: false, bestTest: null });
    assert.deepEqual(mastery, {
      lessons: { done: 1, required: 3, met: false },
      lemmas: { known: 4, total: 12, required: 10, met: false },
      journal: { met: false },
      test: { best: null, required: 70, available: false, met: false },
    });
  });

  await t.test("the test opens only for the active unit with criteria 1-3 met", () => {
    const ready = { lessonsDone: 3, lemmasKnown: 10, lemmasTotal: 12, journalMet: true, bestTest: null };
    assert.equal(masteryOf({ status: "active", ...ready }).test.available, true);
    assert.equal(masteryOf({ status: "locked", ...ready }).test.available, false);
    assert.equal(masteryOf({ status: "active", ...ready, journalMet: false }).test.available, false);
    assert.equal(masteryOf({ status: "active", ...ready, lemmasKnown: 9 }).test.available, false);
    assert.equal(masteryOf({ status: "active", ...ready, bestTest: 75 }).test.met, true);
    assert.equal(masteryOf({ status: "active", ...ready, bestTest: 62 }).test.met, false);
  });

  await t.test("without a language file the lemma criterion can never be met", () => {
    const mastery = masteryOf({ status: "active", lessonsDone: 9, lemmasKnown: 0, lemmasTotal: 0, journalMet: true, bestTest: null });
    assert.equal(mastery.lemmas.met, false);
    assert.equal(mastery.test.available, false);
  });
});

test("lemma matching", async (t) => {
  await t.test("equal or contained as a whole word", () => {
    assert.equal(cardMatchesLemma("Name", "name", "en"), true);
    assert.equal(cardMatchesLemma("my name is", "name", "en"), true);
    assert.equal(cardMatchesLemma("names", "name", "en"), false);
    assert.equal(cardMatchesLemma("rename", "name", "en"), false);
    assert.equal(cardMatchesLemma("l'eau", "eau", "fr"), true);
    assert.equal(cardMatchesLemma("thank you very much", "thank you", "en"), true);
    assert.equal(cardMatchesLemma("¡Hola!", "hola", "es"), true);
  });

  await t.test("ja only needs to contain the lemma", () => {
    assert.equal(cardMatchesLemma("お名前は", "名前", "ja"), true);
    assert.equal(cardMatchesLemma("お茶", "名前", "ja"), false);
  });

  await t.test("ru stress marks do not block a match", () => {
    assert.equal(normalizePhrase("приве́т"), "привет");
    assert.equal(cardMatchesLemma("приве́т, друг", "привет", "ru"), true);
    assert.equal(cardMatchesLemma("ещё раз", "еще", "ru"), true);
    assert.equal(cardMatchesLemma("Всё", "всё", "ru"), true);
  });

  await t.test("typographic apostrophes match the ASCII lemma", () => {
    assert.equal(cardMatchesLemma("Je m’appelle Ana", "m'appelle", "fr"), true);
    assert.equal(cardMatchesLemma("aujourd’hui", "aujourd'hui", "fr"), true);
    assert.equal(cardMatchesLemma("l’albergo", "albergo", "it"), true);
  });

  await t.test("ja: kana reading counts, short lemmas need an exact card", () => {
    const index = new CardIndex(["かぞく", "家族", "人口"], "ja");
    assert.equal(index.has("家族", "かぞく"), true);
    assert.equal(index.has("家"), false);
    assert.equal(index.has("人"), false);
    assert.equal(new CardIndex(["家"], "ja").has("家"), true);
    assert.equal(cardMatchesLemma("家族", "家", "ja"), false);
    assert.equal(cardMatchesLemma("もしもし", "もし", "ja"), false);
    assert.equal(cardMatchesLemma("お名前は", "名前", "ja"), true);
  });

  await t.test("the card index agrees with the single-card rule", () => {
    const fronts = ["my name is", "Goodbye!", "thank you very much", "livestream"];
    const index = new CardIndex(fronts, "en");
    for (const lemma of ["name", "goodbye", "thank you", "live", "please", "very much"]) {
      assert.equal(index.has(lemma), fronts.some((front) => cardMatchesLemma(front, lemma, "en")), lemma);
    }
  });

  await t.test("story presence accepts inflected forms of longer lemmas", () => {
    assert.equal(lemmaInText("She lives in Lisbon.", "live", "en"), true);
    assert.equal(lemmaInText("Hello! I am Ana.", "hello", "en"), true);
    assert.equal(lemmaInText("I am Ana.", "be", "en"), false);
    assert.equal(lemmaInText("毎朝パンを食べます。", "食べる", "ja"), true);
  });

  await t.test("lesson focus prefers lemmas without a card and rotates by lessons done", () => {
    const carded = new CardIndex(["hello", "goodbye"], "en");
    const stable = new CardIndex(["hello"], "en");
    const first = lessonFocusLemmas(UNIT.lemmas, carded, stable, 0).map((item) => item.lemma);
    assert.equal(first.length, 6);
    assert.ok(!first.includes("hello") && !first.includes("goodbye"));
    const second = lessonFocusLemmas(UNIT.lemmas, carded, stable, 1).map((item) => item.lemma);
    assert.notDeepEqual(first, second);
  });
});

test("streak and session dates", async (t) => {
  const now = new Date("2026-11-20T12:00:00.000Z");
  await t.test("consecutive days only", () => {
    assert.equal(streakFrom([]), 0);
    assert.equal(streakFrom(["2026-11-20"]), 1);
    assert.equal(streakFrom(["2026-11-18", "2026-11-20", "2026-11-19", "2026-11-19"]), 3);
    assert.equal(streakFrom(["2026-11-20", "2026-11-18", "2026-11-17"]), 1);
    assert.equal(streakFrom(["2026-03-01", "2026-02-28"]), 2);
  });

  await t.test("the learner's date must be yesterday, today or tomorrow in UTC", () => {
    assert.equal(utcDay(now), "2026-11-20");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(sessionDateAccepted("2026-11-20", now), true);
    assert.equal(sessionDateAccepted("2026-11-19", now), true);
    assert.equal(sessionDateAccepted("2026-11-21", now), true);
    assert.equal(sessionDateAccepted("2026-11-18", now), false);
    assert.equal(sessionDateAccepted("2026-11-22", now), false);
  });

  await t.test("a streak is surely broken only before the day before yesterday", () => {
    assert.equal(streakBroken(null, now), true);
    assert.equal(streakBroken("2026-11-18", now), false);
    assert.equal(streakBroken("2026-11-17", now), true);
  });

  await t.test("session body validation", () => {
    assert.equal(sessionCompleteBodySchema.safeParse({ date: "2026-02-30" }).success, false);
    assert.equal(sessionCompleteBodySchema.safeParse({ date: "2026-11-20", unit_id: "a1-01", elapsed_seconds: 1180 }).success, true);
    assert.equal(sessionCompleteBodySchema.safeParse({ date: "2026-11-20", unit_id: "x1-01" }).success, false);
    assert.equal(unitParamsSchema.safeParse({ id: "c1-03" }).success, true);
    assert.equal(pathFinishBodySchema.safeParse({ attempt_id: "nope", answers: [] }).success, false);
  });
});

test("unit test items", async (t) => {
  await t.test("scores against the server-side key", () => {
    const items = Array.from({ length: 8 }, (_, index) => ({ id: `q${index + 1}`, answer: index % 4 }));
    const answers = items.map((item, index) => ({ item_id: item.id, choice: index < 6 ? item.answer : (item.answer + 1) % 4 }));
    const result = scoreAnswers(items, [...answers, { item_id: "q1", choice: 3 }, { item_id: "zz", choice: 0 }]);
    assert.equal(result.correct, 6);
    assert.equal(result.total, 8);
    assert.equal(result.score, 75);
    assert.equal(scoreAnswers(items, []).score, 0);
  });

  await t.test("blanks a lemma as a whole word", () => {
    assert.equal(blankLemma("Hello, my name is Ana.", "name", "en"), "Hello, my ____ is Ana.");
    assert.equal(blankLemma("Hello, my name is Ana.", "hello", "en"), "____, my name is Ana.");
    assert.equal(blankLemma("Renamed files", "name", "en"), null);
    assert.equal(blankLemma("お名前は何ですか。", "名前", "ja"), "お____は何ですか。");
  });

  await t.test("deterministic fallback: 8 items, 4 distinct options, key is the lemma", () => {
    const items = fallbackTestItems(UNIT, "en", 8, seeded(3));
    assert.equal(items.length, 8);
    assert.deepEqual(items.map((item) => item.id), ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"]);
    assert.ok(items.filter((item) => item.format === "cloze").length >= 1);
    for (const item of items) {
      assert.equal(item.options.length, 4);
      assert.equal(new Set(item.options).size, 4);
      assert.ok(item.answer >= 0 && item.answer <= 3);
      const key = item.options[item.answer] ?? "";
      assert.ok(UNIT.lemmas.some((lemma) => lemma.lemma === key), `${item.id} key ${key} is a unit lemma`);
      if (item.format === "meaning") {
        const gloss = UNIT.lemmas.find((lemma) => lemma.lemma === key)?.gloss ?? "";
        assert.ok(item.prompt.includes(gloss));
      }
    }
  });

  await t.test("a gloss that contains its own lemma never becomes a meaning item", () => {
    const unit: LanguageUnit = {
      ...UNIT,
      lemmas: [...UNIT.lemmas.slice(0, 11), { lemma: "ago", gloss: "before now (two days ago)" }],
    };
    for (let seed = 1; seed < 20; seed += 1) {
      const items = fallbackTestItems(unit, "en", 8, seeded(seed));
      assert.ok(!items.some((item) => item.format === "meaning" && item.prompt.includes("ago")), `seed ${seed}`);
    }
  });

  await t.test("AI drills are filtered and topped up with fallback items", () => {
    const drills = [
      { prompt: "My ____ is Ana.", options: ["name", "city", "friend", "country"], answer: 0 },
      { prompt: "Where are you ___?", options: ["from", "to", "at", "on"], answer: 0 },
      { prompt: "She ____ a teacher.", options: ["is", "are", "am", "be"], answer: 0 },
      { prompt: "No blank here.", options: ["a", "b", "c", "d"], answer: 0 },
      { prompt: "Dup ____ options.", options: ["a", "a", "c", "d"], answer: 0 },
      { prompt: "Bad ____ answer.", options: ["a", "b", "c", "d"], answer: 7 },
    ];
    const accepted = acceptAiDrills(drills, UNIT, "en", seeded(5));
    assert.equal(accepted.length, 3);
    assert.equal(accepted.filter((item) => item.skill === "vocab").length, 2);
    for (const [index, item] of accepted.entries()) {
      const original = drills[index];
      assert.equal(item.options[item.answer], original?.options[original.answer]);
    }
    const composed = composeUnitTest(accepted, fallbackTestItems(UNIT, "en", 8, seeded(9)));
    assert.equal(composed.items.length, 8);
    assert.equal(composed.source, "mixed");
    assert.equal(new Set(composed.items.map((item) => item.id)).size, 8);
    const shown = publicUnitItems(composed.items);
    for (const item of shown) {
      assert.equal("answer" in item, false);
      assert.equal("source" in item, false);
    }
    assert.equal(composeUnitTest([], fallbackTestItems(UNIT, "en")).source, "fallback");
  });

  await t.test("checkpoint raises one level", () => {
    assert.equal(nextLevel("A1"), "A2");
    assert.equal(nextLevel("B2"), "C1");
    assert.equal(nextLevel("C1"), "C2");
  });
});

test("unit lesson prompt and personalization", async (t) => {
  const brief = {
    unit: { id: "a1-01", band: "A1" as const, order: 1, topic: "greeting people", focus: ["speaking" as const] },
    title: "Hello, nice to meet you",
    canDo: ["I can greet people.", "I can say where I am from."],
    grammar: UNIT.grammar,
    lemmas: UNIT.lemmas,
    focus: UNIT.lemmas.slice(0, 6),
  };

  await t.test("unit lines carry goals, grammar and the mandatory core words", () => {
    const lines = unitPromptLines(brief, "football");
    const text = lines.join("\n");
    assert.match(text, /a1-01/);
    assert.match(text, /I can greet people\./);
    assert.match(text, /Present Simple: be/);
    assert.match(text, /hello, goodbye, name, from, country, city/);
    assert.match(text, /Story theme chosen by the learner: football/);
    assert.doesNotMatch(unitPromptLines(brief, "everyday life").join("\n"), /Story theme/);
  });

  await t.test("personalization uses only real signals", () => {
    const empty = { interests: [], goal: "", goalNote: "", weakSkills: [], errorKinds: [], facts: [] };
    assert.deepEqual(personalizationLines(empty), []);
    assert.equal(personalizationStamp(empty), "");
    const full = {
      interests: ["football"],
      goal: "travel",
      goalNote: "Trip to\nLisbon in May",
      weakSkills: ["listening" as const],
      errorKinds: ["articles"],
      facts: ["Has a dog named Bento"],
    };
    const text = personalizationLines(full).join("\n");
    assert.match(text, /travel and get around abroad/);
    assert.match(text, /Trip to Lisbon in May/);
    assert.match(text, /listening/);
    assert.match(text, /articles/);
    assert.match(text, /Bento/);
    assert.notEqual(personalizationStamp(full), "");
    assert.notEqual(personalizationStamp(full), personalizationStamp({ ...full, facts: [] }));
  });

  await t.test("cache key changes with unit, lesson focus and personalization", () => {
    assert.equal(unitCacheSuffix(null, [], ""), "");
    assert.match(unitCacheSuffix("a1-01", ["hello"], ""), /^:u:a1-01:f:[0-9a-f]{16}$/);
    assert.notEqual(unitCacheSuffix("a1-01", ["hello"], ""), unitCacheSuffix("a1-01", ["name"], ""));
    assert.match(unitCacheSuffix(null, [], "abc"), /^:p:abc$/);
  });

  await t.test("missing core words are reported, not filled in", () => {
    const lesson = {
      title: "t",
      story_text: "Hello! My name is Ana and I live in a big city.",
      translation: "x",
      vocabulary: [
        { word: "hello", translation: "olá", example_sentence: "Hello!" },
        { word: "Name", translation: "nome", example_sentence: "My name is Ana." },
        { word: "city", translation: "cidade", example_sentence: "A big city." },
      ],
      journal_prompt: "j",
    };
    assert.deepEqual(missingUnitLemmas(lesson, ["hello", "name", "city", "country", "live"], "en"), ["country", "live"]);
  });

  await t.test("a journal counts for the path only with real content", () => {
    assert.equal(journalCountsForPath("Hi.", "en"), false);
    assert.equal(journalCountsForPath("My name is Ana and I am from Recife.", "en"), true);
    assert.equal(journalCountsForPath("わたしはアナです。", "ja"), false);
    assert.equal(journalCountsForPath("わたしはアナです。レシフェから来ました。", "ja"), true);
  });
});
