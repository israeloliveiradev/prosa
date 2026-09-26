import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginBodySchema, registerBodySchema } from "../src/schemas/auth.ts";
import { checkoutBodySchema, checkoutSessionParamsSchema } from "../src/schemas/billing.ts";
import { evaluateJournalBodySchema } from "../src/schemas/journal.ts";
import { generateLessonBodySchema } from "../src/schemas/lesson.ts";
import { onboardingQuizBodySchema, personalizedLessonBodySchema } from "../src/schemas/onboarding.ts";
import { speakBodySchema } from "../src/schemas/speech.ts";
import { syncReviewsBodySchema } from "../src/schemas/srs.ts";

describe("generateLessonBodySchema", () => {
  it("defaults the topic when languages and level are present", () => {
    const body = generateLessonBodySchema.parse({
      target_lang: "en",
      native_lang: "pt",
      level: "A2",
    });
    assert.equal(body.topic, "everyday life");
  });

  it("rejects a lesson request without a learner profile", () => {
    const parsed = generateLessonBodySchema.safeParse({ topic: "coffee" });
    assert.equal(parsed.success, false);
  });
});

describe("syncReviewsBodySchema", () => {
  it("accepts an idempotent review batch", () => {
    const body = syncReviewsBodySchema.parse({
      user_id: "6f1b1c2a-3d4e-4f50-8a61-123456789abc",
      reviews: [
        {
          client_id: "rev_mno12345abcd",
          front_phrase: "latte",
          back_translation: "latte",
          context_sentence: "I would like a latte.",
          quality: 4,
        },
      ],
    });
    assert.equal(body.reviews.length, 1);
  });

  it("rejects a repeated client id that is too short", () => {
    const parsed = syncReviewsBodySchema.safeParse({
      user_id: "6f1b1c2a-3d4e-4f50-8a61-123456789abc",
      reviews: [
        {
          client_id: "short",
          front_phrase: "latte",
          back_translation: "latte",
          context_sentence: "I would like a latte.",
          quality: 4,
        },
      ],
    });
    assert.equal(parsed.success, false);
  });
});

describe("registerBodySchema", () => {
  it("lowercases the email and defaults the study pair", () => {
    const body = registerBodySchema.parse({
      email: "Ana@Prosa.local",
      password: "senha-forte",
    });
    assert.equal(body.email, "ana@prosa.local");
    assert.equal(body.native_lang, "pt");
    assert.equal(body.target_lang, "en");
    assert.equal(body.level, "A2");
  });

  it("rejects a short password", () => {
    const parsed = registerBodySchema.safeParse({
      email: "ana@prosa.local",
      password: "curta",
    });
    assert.equal(parsed.success, false);
  });
});

describe("loginBodySchema", () => {
  it("rejects an email without a domain", () => {
    const parsed = loginBodySchema.safeParse({
      email: "ana",
      password: "senha-forte",
    });
    assert.equal(parsed.success, false);
  });
});

describe("checkoutBodySchema", () => {
  it("accepts the local paywall return URL", () => {
    const body = checkoutBodySchema.parse({
      success_url: "http://localhost:8081/paywall",
      cancel_url: "http://localhost:8081/paywall",
    });
    assert.equal(body.success_url, "http://localhost:8081/paywall");
  });

  it("rejects a checkout session id outside the Stripe format", () => {
    const parsed = checkoutSessionParamsSchema.safeParse({ id: "sess_123" });
    assert.equal(parsed.success, false);
  });
});

describe("evaluateJournalBodySchema", () => {
  it("rejects an empty journal", () => {
    const parsed = evaluateJournalBodySchema.safeParse({
      text: "   ",
      journal_prompt: "What did you order?",
      target_lang: "en",
      native_lang: "pt",
      level: "A2",
    });
    assert.equal(parsed.success, false);
  });
});

describe("onboardingQuizBodySchema", () => {
  it("accepts a short interest list", () => {
    const body = onboardingQuizBodySchema.parse({
      interests: ["inteligência artificial", "café"],
      goal: "falar no trabalho",
    });
    assert.equal(body.interests.length, 2);
  });

  it("rejects more than twelve interests", () => {
    const parsed = onboardingQuizBodySchema.safeParse({
      interests: Array.from({ length: 13 }, (_, index) => `tema ${index}`),
    });
    assert.equal(parsed.success, false);
  });

  it("accepts German studied through English alongside another pair", () => {
    const body = onboardingQuizBodySchema.parse({
      interests: ["Negócios"],
      tracks: [
        { target_lang: "de", through_lang: "en", active: true },
        { target_lang: "ja", through_lang: "pt" },
      ],
    });
    assert.equal(body.tracks[0]?.through_lang, "en");
    assert.equal(body.tracks[1]?.active, false);
  });

  it("rejects studying a language through itself", () => {
    const parsed = onboardingQuizBodySchema.safeParse({
      interests: ["Negócios"],
      tracks: [{ target_lang: "de", through_lang: "de" }],
    });
    assert.equal(parsed.success, false);
  });
});

describe("personalizedLessonBodySchema", () => {
  it("requires a selected topic", () => {
    const body = personalizedLessonBodySchema.parse({ selected_topic: "Inteligência Artificial" });
    assert.equal(body.selected_topic, "Inteligência Artificial");
  });
});

describe("speakBodySchema", () => {
  it("accepts a story in a supported language code", () => {
    const body = speakBodySchema.parse({ text: "Hello.", lang: "EN" });
    assert.equal(body.lang, "en");
  });
});
