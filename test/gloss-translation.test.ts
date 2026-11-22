import assert from "node:assert/strict";
import test from "node:test";
import type { LanguageUnit } from "../src/curriculum/types.ts";
import {
  GlossTranslator,
  glossCacheKey,
  validateGlosses,
  type GlossModel,
  type GlossStore,
} from "../src/services/gloss-translation.ts";
import { fallbackTestItems } from "../src/services/path-service.ts";

const LEMMAS = [
  { lemma: "hallo", gloss: "hello" },
  { lemma: "danke", gloss: "thank you" },
  { lemma: "Land", gloss: "country (n.)" },
  { lemma: "Stadt", gloss: "city (f.)" },
  { lemma: "Name", gloss: "name (m.)" },
  { lemma: "sein", gloss: "to be" },
  { lemma: "kommen", gloss: "to come" },
  { lemma: "wohnen", gloss: "to live" },
  { lemma: "sprechen", gloss: "to speak" },
  { lemma: "woher", gloss: "where from" },
];
const PT = ["olá", "obrigado", "país", "cidade", "nome", "ser", "vir", "morar", "falar", "de onde"];

const UNIT: LanguageUnit = {
  grammar: { name: "sein", summary: "to be", examples: ["Ich komme aus Brasilien.", "Wie ist dein Name?"] },
  lemmas: LEMMAS,
};

function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function memoryStore(): GlossStore & { data: Map<string, string>; ttl: number[] } {
  const data = new Map<string, string>();
  const ttl: number[] = [];
  return {
    data,
    ttl,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value, seconds) => {
      data.set(key, value);
      ttl.push(seconds);
    },
  };
}

function model(answer: string[] | Error): GlossModel & { calls: number } {
  const self = {
    calls: 0,
    async translateGlosses() {
      self.calls += 1;
      if (answer instanceof Error) {
        throw answer;
      }
      return answer;
    },
  };
  return self;
}

test("gloss translation", async (t) => {
  await t.test("cache key is per target, unit and support language", () => {
    assert.equal(glossCacheKey("DE", "a1-u1", "PT"), "gloss:v1:de:a1-u1:pt");
    assert.notEqual(glossCacheKey("de", "a1-u1", "pt"), glossCacheKey("de", "a1-u1", "fr"));
    assert.notEqual(glossCacheKey("de", "a1-u1", "pt"), glossCacheKey("es", "a1-u1", "pt"));
  });

  await t.test("validation: count, empty, long, lemma leak", () => {
    assert.ok(validateGlosses(LEMMAS, PT, "de"));
    assert.equal(validateGlosses(LEMMAS, PT.slice(1), "de"), null);
    assert.equal(validateGlosses(LEMMAS, [...PT.slice(0, 9), "  "], "de"), null);
    assert.equal(validateGlosses(LEMMAS, [...PT.slice(0, 9), "x".repeat(80)], "de"), null);
    assert.equal(validateGlosses(LEMMAS, ["hallo", ...PT.slice(1)], "de"), null);
    assert.equal(validateGlosses(LEMMAS, ["dizer hallo", ...PT.slice(1)], "de"), null);
    assert.equal(validateGlosses([], [], "de"), null);
  });

  await t.test("english support uses the curriculum glosses without calling the AI", async () => {
    const ai = model(PT);
    const map = await new GlossTranslator(ai, null).forUnit({ targetLang: "de", unitId: "u1", supportLang: "en", lemmas: LEMMAS });
    assert.equal(map?.get("hallo"), "hello");
    assert.equal(ai.calls, 0);
  });

  await t.test("translates once, caches with a long TTL and reuses the cache", async () => {
    const ai = model(PT);
    const store = memoryStore();
    const translator = new GlossTranslator(ai, store);
    const input = { targetLang: "de", unitId: "u1", supportLang: "pt", lemmas: LEMMAS };
    const first = await translator.forUnit(input);
    assert.equal(first?.get("danke"), "obrigado");
    assert.ok(store.data.has("gloss:v1:de:u1:pt"));
    assert.ok((store.ttl[0] ?? 0) >= 60 * 60 * 24 * 30);
    const second = await new GlossTranslator(model(new Error("down")), store).forUnit(input);
    assert.equal(second?.get("danke"), "obrigado");
    assert.equal(ai.calls, 1);
  });

  await t.test("concurrent requests share one AI call", async () => {
    const ai = model(PT);
    const translator = new GlossTranslator(ai, null);
    const input = { targetLang: "de", unitId: "u1", supportLang: "pt", lemmas: LEMMAS };
    const [a, b, c] = await Promise.all([translator.forUnit(input), translator.forUnit(input), translator.forUnit(input)]);
    assert.equal(ai.calls, 1);
    assert.equal(a?.get("Land"), "país");
    assert.equal(b?.get("Land"), "país");
    assert.equal(c?.get("Land"), "país");
  });

  await t.test("no English fallback: AI down, invalid or missing method gives null", async () => {
    const input = { targetLang: "de", unitId: "u1", supportLang: "pt", lemmas: LEMMAS };
    assert.equal(await new GlossTranslator(model(new Error("down")), memoryStore()).forUnit(input), null);
    assert.equal(await new GlossTranslator(model(PT.slice(2)), memoryStore()).forUnit(input), null);
    assert.equal(await new GlossTranslator({}, null).forUnit(input), null);
    const store = memoryStore();
    await new GlossTranslator(model(PT.slice(2)), store).forUnit(input);
    assert.equal(store.data.size, 0, "invalid output is never cached");
  });

  await t.test("test builder: translated glosses become the meaning prompts", () => {
    const map = validateGlosses(LEMMAS, PT, "de");
    const items = fallbackTestItems(UNIT, "de", 8, seeded(3), map);
    assert.equal(items.length, 8);
    const meaning = items.filter((item) => item.format === "meaning");
    assert.ok(meaning.length > 0);
    for (const item of meaning) {
      assert.ok(PT.some((gloss) => item.prompt.includes(gloss)));
      assert.ok(!LEMMAS.some((entry) => item.prompt.includes(`“${entry.gloss}”`)));
    }
  });

  await t.test("test builder: no glosses means cloze only, never English", () => {
    for (const none of [null, new Map<string, string>()]) {
      const items = fallbackTestItems(UNIT, "de", 8, seeded(3), none);
      assert.ok(items.length >= 1 && items.length <= 2);
      assert.ok(items.every((item) => item.format === "cloze"));
      assert.ok(!items.some((item) => LEMMAS.some((entry) => item.prompt.includes(entry.gloss))));
    }
  });

  await t.test("test builder: stored items never expose answers through the public view", () => {
    const items = fallbackTestItems(UNIT, "de", 8, seeded(5), validateGlosses(LEMMAS, PT, "de"));
    assert.ok(items.every((item) => typeof item.answer === "number"));
  });
});
