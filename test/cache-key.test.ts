import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lessonCacheHash } from "../src/services/cache-key.ts";

describe("lessonCacheHash", () => {
  it("uses target language, level and a topic digest", () => {
    const hash = lessonCacheHash("EN", "A2", "Ordering Coffee");
    assert.match(hash, /^en:A2:[a-f0-9]{64}$/);
  });

  it("treats spacing and case as the same topic", () => {
    const left = lessonCacheHash("pt", "B1", "  Mercado   central ");
    const right = lessonCacheHash("PT", "B1", "mercado central");
    assert.equal(left, right);
  });

  it("keeps a lesson explained through another language apart", () => {
    const portuguese = lessonCacheHash("de", "A2", "café", [], "pt");
    const english = lessonCacheHash("de", "A2", "café", [], "en");
    assert.notEqual(portuguese, english);
    assert.match(english, /^de:A2:[a-f0-9]{64}:from:en$/);
  });

  it("keeps a cognate lesson apart from a normal one", () => {
    const plain = lessonCacheHash("en", "A1", "café", [], "pt");
    const anchored = lessonCacheHash("en", "A1", "café", [], "pt", true);
    assert.notEqual(plain, anchored);
    assert.match(anchored, /:cognate$/);
  });

  it("keeps a personalized lesson apart from the shared topic", () => {
    const shared = lessonCacheHash("en", "A2", "Inteligência Artificial");
    const personal = lessonCacheHash("en", "A2", "Inteligência Artificial", ["Startups", "startups"]);
    assert.notEqual(shared, personal);
    assert.match(personal, /^en:A2:[a-f0-9]{64}:i:[a-f0-9]{16}$/);
  });
});
