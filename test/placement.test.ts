import assert from "node:assert/strict";
import test from "node:test";
import { placementAnswerBodySchema, placementStartBodySchema } from "../src/schemas/placement.ts";
import { bankPlacementItems, catalogPlacementItems, shufflePlacementItem } from "../src/services/placement-bank.ts";
import {
  levelFromTheta,
  observePlacement,
  placeLevel,
  placementShouldStop,
  retestOpen,
} from "../src/services/placement-score.ts";

test("placement scoring", async (t) => {
  await t.test("places A2 when A1 and A2 pass and B1 fails", () => {
    const items = [
      { id: "a1a", band: "A1" as const, answer: 0 },
      { id: "a1b", band: "A1" as const, answer: 0 },
      { id: "a1c", band: "A1" as const, answer: 0 },
      { id: "a2a", band: "A2" as const, answer: 0 },
      { id: "a2b", band: "A2" as const, answer: 0 },
      { id: "a2c", band: "A2" as const, answer: 1 },
      { id: "b1a", band: "B1" as const, answer: 0 },
      { id: "b1b", band: "B1" as const, answer: 0 },
      { id: "b1c", band: "B1" as const, answer: 0 },
    ];
    const result = placeLevel(items, {
      a1a: 0,
      a1b: 0,
      a1c: 0,
      a2a: 0,
      a2b: 0,
      a2c: 1,
      b1a: 2,
      b1b: 2,
      b1c: 2,
    });
    assert.equal(result.level, "A2");
    assert.equal(result.correct, 6);
  });

  await t.test("stays A1 when the first band is missed", () => {
    const items = [
      { id: "a1a", band: "A1" as const, answer: 0 },
      { id: "a1b", band: "A1" as const, answer: 0 },
      { id: "a1c", band: "A1" as const, answer: 0 },
    ];
    const result = placeLevel(items, { a1a: 1, a1b: 1, a1c: 0 });
    assert.equal(result.level, "A1");
    assert.equal(result.score, 33);
  });

  await t.test("opens a first test and waits after a fresh result", () => {
    assert.equal(retestOpen({ lastFinishedAt: null, lessonsSince: 0 }).due, true);
    const fresh = retestOpen({ lastFinishedAt: new Date(), lessonsSince: 12 });
    assert.equal(fresh.due, false);
    assert.equal(fresh.reason, "wait");
    const later = retestOpen({
      lastFinishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      lessonsSince: 10,
    });
    assert.equal(later.due, true);
    assert.equal(later.reason, "lessons");
  });

  await t.test("keeps the right option after a shuffle", () => {
    const source = bankPlacementItems("en", "pt")[0];
    assert.ok(source);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const shuffled = shufflePlacementItem(source);
      assert.equal(shuffled.options[shuffled.answer], source.options[source.answer]);
    }
  });

  await t.test("covers every CEFR band in the bank", () => {
    for (const lang of ["en", "es", "de", "fr", "it", "ru", "ja"]) {
      const items = bankPlacementItems(lang, "pt");
      const bands = new Set(items.map((item) => item.band));
      assert.equal(bands.size, 6, lang);
      assert.equal(items.length, 18, lang);
    }
  });

  await t.test("moves the estimate up after a correct hard item", () => {
    const next = observePlacement(-0.5, 1, 1.5, true);
    assert.ok(next.theta > -0.5);
    assert.equal(levelFromTheta(-1.5), "A2");
    assert.equal(levelFromTheta(2.2), "C2");
  });

  await t.test("stops at the cap and when the level is already clear", () => {
    assert.equal(placementShouldStop({ asked: 24, theta: 0, information: 1 }), true);
    assert.equal(placementShouldStop({ asked: 7, theta: -1.5, information: 20 }), false);
    assert.equal(placementShouldStop({ asked: 12, theta: -1.5, information: 12 }), true);
    assert.equal(placementShouldStop({ asked: 14, theta: -1.5, information: 2 }), true);
    assert.equal(placementShouldStop({ asked: 14, theta: -1.05, information: 2 }), false);
  });

  await t.test("keeps a spoken item in the catalog", () => {
    const spoken = catalogPlacementItems("en", "pt").find((item) => item.kind === "listening");
    assert.ok(spoken?.audio_text);
    assert.equal(bankPlacementItems("en", "pt").length, 18);
  });

  await t.test("rejects a broken answer payload", () => {
    assert.equal(placementStartBodySchema.parse({}).target_lang, undefined);
    assert.equal(placementAnswerBodySchema.safeParse({ attempt_id: "nope", item_id: "a", choice: 0 }).success, false);
  });
});
