import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountSettingsBodySchema, forgotBodySchema, resetBodySchema, verifyBodySchema } from "../src/schemas/account.ts";
import { loginBodySchema, registerBodySchema } from "../src/schemas/auth.ts";
import { checkoutBodySchema, checkoutSessionParamsSchema } from "../src/schemas/billing.ts";
import { evaluateJournalBodySchema } from "../src/schemas/journal.ts";
import { generateLessonBodySchema } from "../src/schemas/lesson.ts";
import { onboardingQuizBodySchema, personalizedLessonBodySchema, studyTrackSchema } from "../src/schemas/onboarding.ts";
import { parseAdminEmails } from "../src/config.ts";
import { profileQuerySchema, profileSignalsSchema } from "../src/schemas/profile.ts";
import { proseTurnBodySchema } from "../src/schemas/prose.ts";
import { adminFreezeBodySchema, adminGenerationBodySchema, adminPlanBodySchema } from "../src/schemas/admin.ts";
import { speakBatchBodySchema, speakBodySchema, speakStreamBodySchema } from "../src/schemas/speech.ts";
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

  it("rejects a guest body that only names another account", () => {
    const parsed = generateLessonBodySchema.safeParse({
      user_id: "6f1b1c2a-3d4e-4f50-8a61-123456789abc",
      topic: "coffee",
    });
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
    const withLocale = registerBodySchema.parse({
      email: "ana@prosa.local",
      password: "senha-forte",
      display_locale: "en",
    });
    assert.equal(withLocale.display_locale, "en");
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

  it("rejects a checkout URL with credentials", () => {
    const parsed = checkoutBodySchema.safeParse({
      success_url: "https://user:pass@localhost:8081/paywall",
      cancel_url: "http://localhost:8081/paywall",
    });
    assert.equal(parsed.success, false);
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
    assert.equal(body.goal, "falar no trabalho");

    const withEmptyGoal = onboardingQuizBodySchema.parse({
      interests: ["filosofia"],
      goal: "",
    });
    assert.equal(withEmptyGoal.goal, undefined);
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

describe("speakStreamBodySchema", () => {
  it("accepts a full prosa under eight thousand characters", () => {
    const body = speakStreamBodySchema.parse({ text: "Hello there, this is the day's prose.", lang: "en" });
    assert.equal(body.lang, "en");
  });
});

describe("speakBatchBodySchema", () => {
  it("accepts up to sixteen sentences in one request", () => {
    const body = speakBatchBodySchema.parse({
      texts: ["Hello.", "See you."],
      lang: "en",
      voice: "en-US-AvaNeural",
    });
    assert.equal(body.texts.length, 2);
  });

  it("rejects a seventeenth sentence", () => {
    const parsed = speakBatchBodySchema.safeParse({
      texts: Array.from({ length: 17 }, (_, index) => `Line ${index}.`),
      lang: "en",
    });
    assert.equal(parsed.success, false);
  });
});

describe("adminPlanBodySchema", () => {
  it("accepts only free or pro", () => {
    assert.equal(adminPlanBodySchema.parse({ plan: "pro" }).plan, "pro");
    assert.equal(adminPlanBodySchema.safeParse({ plan: "team" }).success, false);
  });
});

describe("adminFreezeBodySchema", () => {
  it("accepts a single freeze step", () => {
    assert.equal(adminFreezeBodySchema.parse({ delta: 1 }).delta, 1);
    assert.equal(adminFreezeBodySchema.parse({ delta: -1 }).delta, -1);
    assert.equal(adminFreezeBodySchema.safeParse({ delta: 2 }).success, false);
  });
});

describe("adminGenerationBodySchema", () => {
  it("requires a boolean pause flag", () => {
    assert.equal(adminGenerationBodySchema.parse({ paused: true }).paused, true);
    assert.equal(adminGenerationBodySchema.safeParse({ paused: "yes" }).success, false);
  });
});

describe("accountSettingsBodySchema", () => {
  it("accepts a locale and a reminder hour", () => {
    const body = accountSettingsBodySchema.parse({ display_locale: "en", reminder_hour: 7, reminder_enabled: true });
    assert.equal(body.display_locale, "en");
    assert.equal(body.reminder_hour, 7);
  });

  it("accepts a famous mind in its slot", () => {
    const body = accountSettingsBodySchema.parse({ mind_reading: "plato", mind_journal: "davinci" });
    assert.equal(body.mind_reading, "plato");
    assert.equal(body.mind_journal, "davinci");
  });

  it("rejects a mind in the wrong slot", () => {
    assert.equal(accountSettingsBodySchema.safeParse({ mind_reading: "curie" }).success, false);
  });

  it("rejects an empty patch", () => {
    assert.equal(accountSettingsBodySchema.safeParse({}).success, false);
  });
});

describe("forgotBodySchema", () => {
  it("lowercases the recovery email", () => {
    assert.equal(forgotBodySchema.parse({ email: "Ana@Prosa.local" }).email, "ana@prosa.local");
  });
});

describe("verifyBodySchema", () => {
  it("accepts an email and a six-digit code", () => {
    const body = verifyBodySchema.parse({ email: "Ana@Prosa.local", code: "188026" });
    assert.equal(body.email, "ana@prosa.local");
    assert.equal(body.code, "188026");
  });

  it("accepts a code copied with spaces and line breaks", () => {
    const body = verifyBodySchema.parse({ email: "ana@prosa.local", code: "1 8 8 0 2 6\n" });
    assert.equal(body.code, "188026");
  });

  it("rejects a short code", () => {
    assert.equal(verifyBodySchema.safeParse({ email: "ana@prosa.local", code: "12" }).success, false);
  });
});

describe("resetBodySchema", () => {
  it("accepts an email, a six-digit code and a password", () => {
    const body = resetBodySchema.parse({ email: "Ana@Prosa.local", code: "123456", password: "senha-forte" });
    assert.equal(body.email, "ana@prosa.local");
    assert.equal(body.code, "123456");
  });

  it("rejects a short code", () => {
    assert.equal(resetBodySchema.safeParse({ email: "ana@prosa.local", code: "12", password: "senha-forte" }).success, false);
  });
});

describe("parseAdminEmails", () => {
  it("keeps lowercase addresses and drops empty tokens", () => {
    const emails = parseAdminEmails("Ana@Prosa.local, outro,  ");
    assert.equal(emails.has("ana@prosa.local"), true);
    assert.equal(emails.size, 1);
  });
});

describe("proseTurnBodySchema", () => {
  it("opens a turn with only the topic", () => {
    const body = proseTurnBodySchema.parse({ topic: "ordering coffee" });
    assert.equal(body.user_line, "");
    assert.equal(body.history.length, 0);
    assert.equal(body.mind, undefined);
  });

  it("keeps a short history and a speech companion", () => {
    const body = proseTurnBodySchema.parse({
      topic: "cafeteria",
      user_line: "I like this place.",
      mind: "feynman",
      history: [
        { role: "mind", text: "What did you notice first?" },
        { role: "learner", text: "The smell of coffee." },
      ],
    });
    assert.equal(body.mind, "feynman");
    assert.equal(body.history.length, 2);
  });

  it("rejects a ninth history turn", () => {
    const parsed = proseTurnBodySchema.safeParse({
      topic: "cafeteria",
      history: Array.from({ length: 9 }, (_, index) => ({
        role: index % 2 === 0 ? "mind" : "learner",
        text: "hello",
      })),
    });
    assert.equal(parsed.success, false);
  });
});

describe("studyTrackSchema (RF02 - Par de idiomas)", () => {
  it("accepts valid distinct target and through languages", () => {
    const parsed = studyTrackSchema.safeParse({
      target_lang: "en",
      through_lang: "pt",
      level: "B1",
      active: true,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects identical target and through languages (RF02)", () => {
    const parsed = studyTrackSchema.safeParse({
      target_lang: "en",
      through_lang: "en",
    });
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.match(parsed.error.issues[0].message, /Study a language through a different language/);
    }
  });

  it("rejects Portuguese as target language", () => {
    const parsed = studyTrackSchema.safeParse({
      target_lang: "pt",
      through_lang: "en",
    });
    assert.equal(parsed.success, false);
  });
});

describe("profileSignalsSchema (RF01 - Perfil de estudo)", () => {
  it("accepts valid profile signals with flexible session duration modes", () => {
    const parsed = profileSignalsSchema.safeParse({
      target_lang: "es",
      reading: 85,
      listening: 70,
      session_duration_mode: "pro_40",
      add_active_seconds: 1200,
      milestone_unlocked: 30,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects invalid session duration mode", () => {
    const parsed = profileSignalsSchema.safeParse({
      target_lang: "en",
      session_duration_mode: "ultra_120",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects scores outside 0-100 bounds", () => {
    const parsed = profileSignalsSchema.safeParse({
      target_lang: "en",
      reading: 105,
    });
    assert.equal(parsed.success, false);
  });
});

describe("profileQuerySchema", () => {
  it("accepts supported target language and trims whitespace", () => {
    const parsed = profileQuerySchema.parse({ target_lang: "  fr  " });
    assert.equal(parsed.target_lang, "fr");
  });

  it("rejects unsupported target language", () => {
    const parsed = profileQuerySchema.safeParse({ target_lang: "klingon" });
    assert.equal(parsed.success, false);
  });
});

