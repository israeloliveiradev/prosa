import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Redis } from "ioredis";
import type { Pool } from "pg";
import type { AuthUser } from "../src/auth/session.ts";
import { UI_LOCALES } from "../src/curriculum/types.ts";
import { billingStatus } from "../src/routes/billing.ts";
import { duelRoundBodySchema, duelScoreBodySchema } from "../src/schemas/duel.ts";
import { personaTurnBodySchema, sceneSchema } from "../src/schemas/persona.ts";
import { DuelService } from "../src/services/duel-service.ts";
import { rankUnitDrills, unitDuelPlan } from "../src/services/duel-focus.ts";
import type { GeminiGateway } from "../src/services/gemini-gateway.ts";
import type { NeuralVoice } from "../src/services/neural-voice.ts";
import { NewsPreload, preloadOrder, type PreloadGroup } from "../src/services/news-preload.ts";
import { PersonaService } from "../src/services/persona-service.ts";
import { assembleScenes, fallbackScenes, GOAL_KINDS, interestLabel } from "../src/services/scene-plan.ts";
import { ShadowingService } from "../src/services/shadowing-service.ts";
import { streakOnRead } from "../src/services/streak.ts";

const NOW = new Date("2026-11-20T15:00:00.000Z");

const USER: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "m3@prosa.test",
  native_lang: "pt",
  target_lang: "en",
  level: "A1",
  plan: "free",
  role: "learner",
};

/** Redis falso em memória (get/set/del), o bastante para cache e trava. */
function fakeRedis(): Redis & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string, ...args: unknown[]) => {
      if (args.includes("NX") && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return "OK";
    },
    del: async (key: string) => (store.delete(key) ? 1 : 0),
  } as unknown as Redis & { store: Map<string, string> };
}

describe("streak on read", () => {
  it("counts consecutive days ending today or yesterday (UTC)", () => {
    assert.deepEqual(streakOnRead(["2026-11-20", "2026-11-19", "2026-11-18", "2026-11-16"], NOW), {
      streak_count: 3,
      last_session_date: "2026-11-20",
    });
    assert.deepEqual(streakOnRead(["2026-11-19", "2026-11-18"], NOW), { streak_count: 2, last_session_date: "2026-11-19" });
  });

  it("keeps one day of grace for time zones west of UTC (the app decides by local date)", () => {
    assert.deepEqual(streakOnRead(["2026-11-18", "2026-11-17", "2026-11-16"], NOW), {
      streak_count: 3,
      last_session_date: "2026-11-18",
    });
  });

  it("is 0 when the last session is older than the day before yesterday, and keeps the date", () => {
    assert.deepEqual(streakOnRead(["2026-11-17", "2026-11-16"], NOW), {
      streak_count: 0,
      last_session_date: "2026-11-17",
    });
    assert.deepEqual(streakOnRead([], NOW), { streak_count: 0, last_session_date: null });
  });
});

describe("conversation scenes", () => {
  const unit = { id: "a1-04", title: "Pedir no café", canDo: ["Consigo pedir comida e bebida."] };

  it("builds 3 valid fallback scenes (goal, unit, interest) for every goal and interface locale", () => {
    for (const goal of GOAL_KINDS) {
      for (const locale of UI_LOCALES) {
        const scenes = fallbackScenes({ goal, locale, unit, interest: "Viagens" });
        assert.deepEqual(
          scenes.map((scene) => scene.kind),
          ["goal", "unit", "interest"],
        );
        for (const scene of scenes) {
          assert.equal(sceneSchema.safeParse(scene).success, true, `${goal}/${locale}/${scene.kind}`);
        }
        assert.equal(scenes[1]?.unit_id, "a1-04");
        assert.equal(scenes[0]?.unit_id, null);
        assert.equal(scenes[0]?.id, `fb-goal-${goal}`);
      }
    }
  });

  it("uses travel without a goal, the unit goal as objective and localized interest labels", () => {
    const scenes = fallbackScenes({ goal: null, locale: "fr", unit, interest: "Tecnologia e IA" });
    assert.equal(scenes[0]?.id, "fb-goal-travel");
    assert.equal(scenes[1]?.objective, "Consigo pedir comida e bebida.");
    assert.match(scenes[2]?.title ?? "", /technologie et IA/);
    assert.equal(interestLabel("Música", "ja"), "音楽");
    assert.equal(interestLabel("Xadrez", "en"), "Xadrez");
    assert.equal(interestLabel(null, "de"), "Alltagsthemen");
  });

  it("assembles AI scenes into one per kind with server ids, or null when a kind is missing", () => {
    const base = { title: "T", setting: "S", learner_role: "L", partner_role: "P", objective: "O", twist: null };
    const scenes = assembleScenes(
      [
        { ...base, kind: "interest" },
        { ...base, kind: "goal" },
        { ...base, kind: "unit", twist: "The kitchen closes soon." },
      ],
      "a1-04",
      "2026-11-20",
    );
    assert.deepEqual(
      scenes?.map((scene) => [scene.id, scene.unit_id]),
      [
        ["ai-goal-20261120", null],
        ["ai-unit-20261120", "a1-04"],
        ["ai-interest-20261120", null],
      ],
    );
    assert.equal(assembleScenes([{ ...base, kind: "goal" }], "a1-04", "2026-11-20"), null);
  });

  function scenePool(): Pool {
    return {
      query: async (sql: string) => {
        if (/FROM users/.test(sql)) {
          return { rows: [{ goal: "career", goal_note: null, interests: ["Música"], display_locale: "es" }] };
        }
        if (/FROM path_progress/.test(sql)) {
          return { rows: [{ unit_id: "a1-02" }] };
        }
        return { rows: [] };
      },
    } as unknown as Pool;
  }

  it("falls back to static scenes when the AI fails, in the account interface language, and caches briefly", async () => {
    const redis = fakeRedis();
    let calls = 0;
    const gemini = {
      conversationScenes: async () => {
        calls += 1;
        throw new Error("model down");
      },
    } as unknown as GeminiGateway;
    const service = new PersonaService(scenePool(), gemini, redis);
    const result = await service.scenes(USER, undefined, NOW);
    assert.equal(result.source, "fallback");
    assert.equal(result.scenes.length, 3);
    assert.equal(result.scenes[0]?.title, "Entrevista de trabajo");
    assert.equal(result.scenes[1]?.unit_id, "a1-02");
    assert.match(result.scenes[2]?.title ?? "", /música/);
    assert.ok([...redis.store.keys()].some((key) => key.includes(":en:es:2026-11-20")));
    await service.scenes(USER, undefined, NOW);
    assert.equal(calls, 1);
  });

  it("returns AI scenes with source ai and the unit id from the trail", async () => {
    const base = { title: "Entrevista", setting: "Una oficina.", learner_role: "Candidata", partner_role: "Jefe", objective: "Conseguir el puesto.", twist: "" };
    const gemini = {
      conversationScenes: async () => ({
        scenes: [
          { ...base, kind: "goal", twist: null },
          { ...base, kind: "unit", twist: null },
          { ...base, kind: "interest", twist: null },
        ],
      }),
    } as unknown as GeminiGateway;
    const result = await new PersonaService(scenePool(), gemini, fakeRedis()).scenes(USER, "en", NOW);
    assert.equal(result.source, "ai");
    assert.equal(result.scenes[1]?.unit_id, "a1-02");
    assert.equal(result.scenes[1]?.id, "ai-unit-20261120");
  });

  it("accepts a turn with a scene object or a legacy scene_id, never neither", () => {
    const scene = fallbackScenes({ goal: "travel", locale: "pt", unit, interest: null })[0];
    assert.equal(personaTurnBodySchema.safeParse({ scene, user_line: "Hello", history: [] }).success, true);
    assert.equal(personaTurnBodySchema.safeParse({ scene_id: "en-london-cafe", user_line: "Hi", history: [] }).success, true);
    assert.equal(personaTurnBodySchema.safeParse({ user_line: "Hi", history: [] }).success, false);
    const messy = sceneSchema.parse({ ...scene, setting: "  Line one\nline two  " });
    assert.equal(messy.setting, "Line one line two");
  });
});

describe("unit duel", () => {
  const lemmas = ["coffee", "tea", "water", "menu", "bill", "table", "order", "like", "want", "please", "cake", "juice"].map((lemma) => ({ lemma, gloss: lemma }));

  it("targets the unit grammar and core lemmas, unfixed lemmas first, at most 10", () => {
    const plan = unitDuelPlan({
      topic: "ordering food and drinks",
      grammar: { name: "would like", summary: "Polite requests." },
      lemmas,
      focus: [lemmas[10]!, lemmas[3]!],
    });
    assert.equal(plan.words.length, 10);
    assert.deepEqual(plan.words.slice(0, 3), ["cake", "menu", "coffee"]);
    assert.equal(new Set(plan.words).size, 10);
    assert.equal(plan.grammar, "would like: Polite requests.");
  });

  it("puts drills that use a unit word first", () => {
    const drill = (prompt: string, answer: string) => ({ prompt, options: [answer, "x", "y", "z"], answer: 0 });
    const ranked = rankUnitDrills(
      [drill("I ____ to the park.", "went"), drill("Can I see the ____?", "menu"), drill("She ____ tall.", "is"), drill("A cup of ____, please.", "tea")],
      ["menu", "tea"],
      "en",
    );
    assert.deepEqual(
      ranked.map((item) => item.options[0]),
      ["menu", "tea", "went", "is"],
    );
  });

  it("validates the round and score bodies", () => {
    assert.equal(duelRoundBodySchema.safeParse({}).success, true);
    assert.equal(duelRoundBodySchema.safeParse({ unit_id: "a1-04" }).success, true);
    assert.equal(duelRoundBodySchema.safeParse({ unit_id: "z9-99" }).success, false);
    assert.equal(duelScoreBodySchema.safeParse({ score: 30, best_combo: 2, correct_count: 2, unit_id: "a2-01" }).success, true);
  });

  it("sends the unit plan to the model, echoes unit_id and returns the personal best", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const pool = {
      query: async (sql: string, params: unknown[] = []) => {
        seen.push({ sql, params });
        if (/FROM path_progress/.test(sql)) {
          return { rows: [{ status: "active" }] };
        }
        if (/max\(score\)/.test(sql)) {
          return { rows: [{ best: params[2] === "a1-04" ? 140 : null }] };
        }
        return { rows: [] };
      },
    } as unknown as Pool;
    let unitInput: unknown;
    const gemini = {
      duelDrills: async (input: { unit?: unknown }) => {
        unitInput = input.unit;
        return {
          drills: Array.from({ length: 10 }, (_, index) => ({ prompt: `Item ${index} ____ here.`, options: [`a${index}`, `b${index}`, `c${index}`, `d${index}`], answer: 1 })),
        };
      },
    } as unknown as GeminiGateway;
    const service = new DuelService(pool, gemini);
    const round = await service.round(USER, "a1-04");
    assert.equal(round.unit_id, "a1-04");
    assert.equal(round.best, 140);
    assert.equal(round.drills.length, 10);
    const plan = unitInput as { words: string[]; grammar: string | null; topic: string };
    assert.ok(plan.words.length >= 10);
    assert.match(plan.topic, /food and drinks/);
    assert.ok(plan.grammar);
    const free = await service.round(USER);
    assert.equal(free.unit_id, null);
    assert.equal(free.best, null);
  });

  it("refuses a locked unit, also before the trail has rows for a new account", async () => {
    const pool = { query: async () => ({ rows: [{ status: "locked" }] }) } as unknown as Pool;
    await assert.rejects(new DuelService(pool, {} as GeminiGateway).round(USER, "b1-01"), /locked/);
    const empty = { query: async () => ({ rows: [] }) } as unknown as Pool;
    await assert.rejects(new DuelService(empty, {} as GeminiGateway).round(USER, "c1-03"), /locked/);
  });
});

describe("honest rhythm", () => {
  const neural = { speak: async () => Promise.reject(new Error("no voice")) } as unknown as NeuralVoice;
  const audio = { audio: Buffer.from([1, 2, 3]), filename: "a.webm", mimeType: "audio/webm", referenceText: "I like coffee", language: "en" };

  it("reports rhythm as not measured (0) when the provider could not measure it", async () => {
    const gemini = {
      transcribeProsody: async () => ({ transcription: "I like coffee", rhythmScore: 0, rhythmMeasured: false, words: [] }),
    } as unknown as GeminiGateway;
    const result = await new ShadowingService(gemini, neural).analyzePhonetic(audio);
    assert.equal(result.accuracy_score, 100);
    assert.equal(result.rhythm_measured, false);
    assert.equal(result.pitch_rhythm_match, 0);
    assert.equal(result.cadence_match, 0);
  });

  it("keeps a measured rhythm and zeroes silence", async () => {
    const measured = {
      transcribeProsody: async () => ({ transcription: "I like coffee", rhythmScore: 82, rhythmMeasured: true, words: [] }),
    } as unknown as GeminiGateway;
    const ok = await new ShadowingService(measured, neural).analyzePhonetic(audio);
    assert.equal(ok.rhythm_measured, true);
    assert.equal(ok.pitch_rhythm_match, 82);
    const silent = {
      transcribeProsody: async () => ({ transcription: "", rhythmScore: 0, rhythmMeasured: true, words: [] }),
    } as unknown as GeminiGateway;
    const zero = await new ShadowingService(silent, neural).analyzePhonetic(audio);
    assert.equal(zero.accuracy_score, 0);
    assert.equal(zero.pitch_rhythm_match, 0);
  });

  it("marks plain shadowing as not measuring rhythm", async () => {
    const gemini = { transcribe: async () => "I like coffee" } as unknown as GeminiGateway;
    const result = await new ShadowingService(gemini, neural).analyze(audio);
    assert.equal(result.rhythm_measured, false);
  });
});

describe("billing status", () => {
  it("never offers checkout without Stripe configuration", () => {
    assert.deepEqual(billingStatus({ STRIPE_SECRET_KEY: "", STRIPE_PRICE_ID: "" }), {
      configured: false,
      checkout_available: false,
      reason: "not_configured",
    });
    assert.equal(billingStatus({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_ID: " " }).checkout_available, false);
    assert.deepEqual(billingStatus({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_ID: "price_1" }), {
      configured: true,
      checkout_available: true,
      reason: null,
    });
  });
});

describe("news preload", () => {
  const groups: PreloadGroup[] = [
    { target_lang: "en", native_lang: "pt", level: "A2", interest: "Ciência" },
    { target_lang: "de", native_lang: "pt", level: "B1", interest: null },
  ];
  const pool = { query: async () => ({ rows: groups }) } as unknown as Pool;
  const headlines = async (lang: string) =>
    [0, 1, 2].map((index) => ({ title: `${lang} story ${index}`, url: `https://www.bbc.com/${lang}/${index}`, summary: "s" }));

  it("is off unless enabled", async () => {
    let calls = 0;
    const preload = new NewsPreload(pool, fakeRedis(), { adaptedNews: async () => ((calls += 1), { cached: false }) }, { enabled: false });
    assert.equal((await preload.tick(NOW)).skipped, true);
    assert.equal(calls, 0);
  });

  it("covers story 0 of every group first and stops at the generation cap", async () => {
    assert.deepEqual(
      preloadOrder(groups).slice(0, 3).map((step) => [step.group.target_lang, step.index]),
      [
        ["en", 0],
        ["de", 0],
        ["en", 1],
      ],
    );
    const made: string[] = [];
    const redis = fakeRedis();
    const preload = new NewsPreload(
      pool,
      redis,
      {
        adaptedNews: async ({ headline }) => {
          made.push(headline.url);
          return { cached: false };
        },
      },
      { enabled: true, maxGenerations: 3 },
      undefined,
      { headlines },
    );
    const result = await preload.tick(NOW);
    assert.equal(result.generated, 3);
    assert.deepEqual(made, ["https://www.bbc.com/en/0", "https://www.bbc.com/de/0", "https://www.bbc.com/en/1"]);
    assert.equal(redis.store.has("prosa:news-preload:lock"), false);
  });

  it("skips cached stories without spending the cap and marks finished groups for the day", async () => {
    const redis = fakeRedis();
    let generated = 0;
    const preload = new NewsPreload(
      pool,
      redis,
      {
        adaptedNews: async ({ headline }) => {
          const cached = headline.url.endsWith("/0");
          generated += cached ? 0 : 1;
          return { cached };
        },
      },
      { enabled: true, maxGenerations: 20 },
      undefined,
      { headlines },
    );
    const first = await preload.tick(NOW);
    assert.equal(first.generated, 4);
    assert.equal(generated, 4);
    const second = await preload.tick(NOW);
    assert.equal(second.groups, 0);
    assert.equal(second.generated, 0);
  });
});
