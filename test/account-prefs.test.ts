import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import { tokenHash as tokenHashOf } from "../src/auth/session.ts";
import { registerAudioRoutes, audioRateKey, sameCourseLanguage } from "../src/routes/audio.ts";
import { REVIEW_CLOCK_SKEW_MS, REVIEW_MAX_AGE_MS, reviewTime } from "../src/routes/srs.ts";
import { accountSettingsBodySchema } from "../src/schemas/account.ts";
import { registerBodySchema } from "../src/schemas/auth.ts";
import { mnemonicBodySchema, syncReviewsBodySchema } from "../src/schemas/srs.ts";
import { scheduleFsrs } from "../src/services/fsrs.ts";
import {
  clientProfileSignals,
  measuredFieldsIn,
  pronunciationSignals,
} from "../src/services/learner-profile.ts";
import { brandedMail, mailCopyLocale } from "../src/services/mail-templates.ts";
import { mnemonicEligible, reviewHistory } from "../src/services/mnemonic-service.ts";
import type { NeuralVoice } from "../src/services/neural-voice.ts";
import type { ShadowingService } from "../src/services/shadowing-service.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);

describe("display_locale for the 7 interface languages", () => {
  for (const locale of ["pt", "en", "de", "fr", "es", "it", "ja"]) {
    it(`register and settings accept ${locale}`, () => {
      const body = registerBodySchema.parse({ email: "ana@prosa.local", password: "senha-forte", display_locale: locale });
      assert.equal(body.display_locale, locale);
      assert.equal(accountSettingsBodySchema.parse({ display_locale: locale }).display_locale, locale);
    });
  }

  it("rejects a language outside the interface set", () => {
    assert.equal(registerBodySchema.safeParse({ email: "ana@prosa.local", password: "senha-forte", display_locale: "ru" }).success, false);
    assert.equal(accountSettingsBodySchema.safeParse({ display_locale: "pt-BR" }).success, false);
  });
});

describe("account preferences in PATCH /account/settings", () => {
  it("accepts goal, goal note and daily minutes", () => {
    const body = accountSettingsBodySchema.parse({ goal: "travel", goal_note: "  Lisboa em março ", daily_minutes: 30 });
    assert.equal(body.goal, "travel");
    assert.equal(body.goal_note, "Lisboa em março");
    assert.equal(body.daily_minutes, 30);
  });

  it("clears the goal with null and the note with an empty string", () => {
    const body = accountSettingsBodySchema.parse({ goal: null, goal_note: "   " });
    assert.equal(body.goal, null);
    assert.equal(body.goal_note, null);
    assert.ok("goal" in body);
  });

  it("rejects an unknown goal, minutes outside 10/20/30 and a note over 200 characters", () => {
    assert.equal(accountSettingsBodySchema.safeParse({ goal: "fun" }).success, false);
    assert.equal(accountSettingsBodySchema.safeParse({ daily_minutes: 15 }).success, false);
    assert.equal(accountSettingsBodySchema.safeParse({ daily_minutes: "20" }).success, false);
    assert.equal(accountSettingsBodySchema.safeParse({ goal_note: "x".repeat(201) }).success, false);
  });
});

describe("mail letters for every interface language", () => {
  it("writes de, fr, es, it and ja letters in English", () => {
    for (const locale of ["de", "fr", "es", "it", "ja"] as const) {
      assert.equal(mailCopyLocale(locale), "en");
      const letter = brandedMail({ locale, kind: "verify", code: "123456", email: "ana@prosa.local" });
      assert.match(letter.subject, /Confirm your Prosa account/);
      assert.match(letter.html, /<html lang="en">/);
      assert.doesNotMatch(letter.html, /Recebemos|Confirme|Seu código/);
      assert.match(letter.text, /123456/);
    }
  });

  it("keeps Portuguese for pt and drops the invented details", () => {
    const letter = brandedMail({ locale: "pt", kind: "login", code: "654321", email: "ana@prosa.local" });
    assert.match(letter.html, /<html lang="pt">/);
    assert.match(letter.html, /Recebemos uma solicitação para entrar na sua conta Prosa/);
    assert.doesNotMatch(letter.html, /Localização|Criptografia E2E|ofensiva de 14 dias|localhost:8081/);
  });

  it("uses each letter's own body (a reminder does not talk about signing in)", () => {
    const letter = brandedMail({ locale: "en", kind: "reminder", name: "Ana" });
    assert.match(letter.html, /Hello, Ana!/);
    assert.doesNotMatch(letter.html, /sign-in request/);
  });
});

describe("reviewed_at on /srs/sync", () => {
  it("accepts an ISO time with offset and refuses anything else", () => {
    const base = {
      user_id: "6f4f4c1d-8a43-4a62-9d6f-3e5f2d9ad001",
      reviews: [{ client_id: "review-0001", front_phrase: "hello", back_translation: "olá", context_sentence: "Hello there.", quality: 4 }],
    };
    assert.equal(syncReviewsBodySchema.safeParse(base).success, true);
    const withTime = { ...base, reviews: [{ ...base.reviews[0], reviewed_at: "2026-11-19T08:30:00.000Z" }] };
    assert.equal(syncReviewsBodySchema.safeParse(withTime).success, true);
    const withOffset = { ...base, reviews: [{ ...base.reviews[0], reviewed_at: "2026-11-19T08:30:00-03:00" }] };
    assert.equal(syncReviewsBodySchema.safeParse(withOffset).success, true);
    const badTime = { ...base, reviews: [{ ...base.reviews[0], reviewed_at: "ontem" }] };
    assert.equal(syncReviewsBodySchema.safeParse(badTime).success, false);
  });

  it("uses the client time inside the 30-day window", () => {
    const at = NOW - 3 * DAY;
    assert.equal(reviewTime(new Date(at).toISOString(), NOW, null), at);
    assert.equal(reviewTime(new Date(NOW - REVIEW_MAX_AGE_MS).toISOString(), NOW, null), NOW - REVIEW_MAX_AGE_MS);
  });

  it("falls back to the server clock for a future or too-old time", () => {
    assert.equal(reviewTime(new Date(NOW + DAY).toISOString(), NOW, null), NOW);
    assert.equal(reviewTime(new Date(NOW - REVIEW_MAX_AGE_MS - 1000).toISOString(), NOW, null), NOW);
    assert.equal(reviewTime(undefined, NOW, null), NOW);
  });

  it("cuts a slightly fast device clock to now", () => {
    assert.equal(reviewTime(new Date(NOW + REVIEW_CLOCK_SKEW_MS - 1000).toISOString(), NOW, null), NOW);
  });

  it("never moves a card back before its last review", () => {
    const last = NOW - DAY;
    assert.equal(reviewTime(new Date(NOW - 2 * DAY).toISOString(), NOW, last), last);
  });

  it("schedules from the review time, not from the sync time", () => {
    const first = scheduleFsrs({ stability: 0, difficulty: 0, reps: 0, lastReviewAt: null }, 4, NOW - 10 * DAY);
    const state = { stability: first.stability, difficulty: first.difficulty, reps: first.reps, lastReviewAt: NOW - 10 * DAY };
    const reviewedAt = reviewTime(new Date(NOW - 5 * DAY).toISOString(), NOW, state.lastReviewAt);
    const offline = scheduleFsrs(state, 4, reviewedAt);
    const late = scheduleFsrs(state, 4, NOW);
    assert.equal(offline.dueAt - reviewedAt, offline.intervalDays * DAY);
    assert.ok(late.stability > offline.stability, "a longer gap grows stability more");
  });
});

describe("FSRS-5 post-lapse stability", () => {
  it("never grows a card's stability after Again", () => {
    for (const previous of [0.5, 2, 3.2, 10, 45, 200]) {
      const state = { stability: previous, difficulty: 5, reps: 6, lastReviewAt: NOW - Math.round(previous * DAY) };
      const next = scheduleFsrs(state, 0, NOW);
      assert.ok(next.stability <= previous, `stability ${next.stability} > ${previous}`);
      assert.equal(next.status, "learning");
    }
  });

  it("caps at the previous stability when the forget curve would exceed it", () => {
    // Estabilidade baixa e anos sem revisar: a curva de esquecimento sozinha daria mais que 0,3.
    const state = { stability: 0.3, difficulty: 1, reps: 2, lastReviewAt: NOW - 1000 * DAY };
    assert.equal(scheduleFsrs(state, 0, NOW).stability, 0.3);
  });
});

describe("/profile/signals takes preferences, not scores", () => {
  it("lists every measured field present in the body", () => {
    assert.deepEqual(
      measuredFieldsIn({ target_lang: "en", reading: 80, fluency: 50, weekly_aim: "x", fluency_wpm: 120, error: "tense" }),
      ["reading", "fluency", "error", "fluency_wpm"],
    );
    assert.deepEqual(measuredFieldsIn({ target_lang: "en", weekly_aim: "pedir café", session_duration_mode: "pro_40" }), []);
  });

  it("keeps only the learner's own choices", () => {
    const signals = clientProfileSignals({
      weekly_aim: "pedir café",
      minutes_per_day: 30,
      session_duration_mode: "pro_40",
      paused_session_state: null,
      reading: 99,
      lexicon_size: 5000,
      add_active_seconds: 9999,
    });
    assert.deepEqual(signals, { weekly_aim: "pedir café", minutes_per_day: 30, session_duration_mode: "pro_40", paused_session_state: null });
  });

  it("turns a server-measured shadowing result into a pronunciation signal", () => {
    assert.deepEqual(
      pronunciationSignals({
        transcription: "the three trees",
        accuracy_score: 72.4,
        sounds: [
          { held: true, sound: { en: "vowel" } },
          { held: false, sound: { en: "th" } },
        ],
      }),
      { pronunciation: 72, sound: "th" },
    );
  });

  it("records nothing for silence", () => {
    assert.equal(pronunciationSignals({ transcription: "", accuracy_score: 0 }), null);
    assert.equal(pronunciationSignals({ transcription: "  ", accuracy_score: 40 }), null);
    assert.equal(pronunciationSignals({ transcription: "hi", accuracy_score: 0 }), null);
  });
});

describe("mnemonic eligibility from server review history", () => {
  it("counts /srs/sync events first and old review logs only when there are none", () => {
    assert.deepEqual(reviewHistory({ synced_reviews: 10, synced_failures: 7, logged_reviews: 3, logged_failures: 0 }), { reviews: 10, failures: 7 });
    assert.deepEqual(reviewHistory({ synced_reviews: 0, synced_failures: 0, logged_reviews: 5, logged_failures: 4 }), { reviews: 5, failures: 4 });
    const history = reviewHistory({ synced_reviews: 10, synced_failures: 7, logged_reviews: 0, logged_failures: 0 });
    assert.equal(mnemonicEligible(5, history.reviews, history.failures), true);
    const fresh = reviewHistory({ synced_reviews: 0, synced_failures: 0, logged_reviews: 0, logged_failures: 0 });
    assert.equal(mnemonicEligible(5, fresh.reviews, fresh.failures), false);
  });

  it("only needs the card's front phrase from the client", () => {
    assert.equal(mnemonicBodySchema.safeParse({ front_phrase: "hello" }).success, true);
  });
});

describe("paid /audio/* routes", () => {
  const USER = {
    id: "6f4f4c1d-8a43-4a62-9d6f-3e5f2d9ad001",
    email: "ana@prosa.local",
    native_lang: "pt",
    target_lang: "en",
    level: "A1",
    plan: "free",
    role: "learner",
  };
  const OTHER = { ...USER, id: "6f4f4c1d-8a43-4a62-9d6f-3e5f2d9ad002", email: "bia@prosa.local" };
  const TOKEN_A = "a".repeat(43);
  const TOKEN_B = "b".repeat(43);

  /** Pool falso: devolve o usuário do token (o hash do token não importa aqui) e conta as consultas. */
  function fakePool(): { pool: Pool; queries: string[] } {
    const queries: string[] = [];
    const pool = {
      query: async (sql: string, params: unknown[] = []) => {
        queries.push(sql);
        if (/FROM auth_sessions/.test(sql)) {
          const hash = String(params[0] ?? "");
          const rows = hash ? [hash === tokenHashOf(TOKEN_A) ? USER : hash === tokenHashOf(TOKEN_B) ? OTHER : null].filter(Boolean) : [];
          return { rows, rowCount: rows.length };
        }
        return { rows: [], rowCount: 0 };
      },
    } as unknown as Pool;
    return { pool, queries };
  }

  const neural = {
    speak: async () => ({ audioUrl: "/api/v1/audio/neural/x", words: [] }),
  } as unknown as NeuralVoice;
  const shadowing = {} as ShadowingService;

  async function build(pool?: Pool) {
    const app = Fastify();
    await app.register(rateLimit, { global: true, max: 120, timeWindow: "1 minute" });
    registerAudioRoutes(app, shadowing, neural, pool);
    await app.ready();
    return app;
  }

  it("answers 401 without a token and never reaches the provider", async () => {
    const { pool } = fakePool();
    const app = await build(pool);
    for (const url of ["/api/v1/audio/speak", "/api/v1/tts/synthesize", "/api/v1/audio/speak-batch", "/api/v1/audio/transcribe", "/api/v1/audio/analyze-shadowing-phonetic"]) {
      const response = await app.inject({ method: "POST", url, payload: { text: "hi", lang: "en" } });
      assert.equal(response.statusCode, 401, url);
    }
    await app.close();
  });

  it("serves a signed-in learner and keeps the voice catalog open", async () => {
    const { pool } = fakePool();
    const app = await build(pool);
    const spoken = await app.inject({
      method: "POST",
      url: "/api/v1/audio/speak",
      headers: { authorization: `Bearer ${TOKEN_A}` },
      payload: { text: "hi", lang: "en" },
    });
    assert.equal(spoken.statusCode, 200);
    assert.equal(spoken.json().audio_url, "/api/v1/audio/neural/x");
    const voices = await app.inject({ method: "GET", url: "/api/v1/audio/voices?lang=en" });
    assert.equal(voices.statusCode, 200);
    await app.close();
  });

  it("limits per user, not per IP", async () => {
    const { pool } = fakePool();
    const app = await build(pool);
    const speak = (token: string) =>
      app.inject({ method: "POST", url: "/api/v1/audio/speak", headers: { authorization: `Bearer ${token}` }, payload: { text: "hi", lang: "en" } });
    for (let index = 0; index < 30; index += 1) {
      assert.equal((await speak(TOKEN_A)).statusCode, 200);
    }
    assert.equal((await speak(TOKEN_A)).statusCode, 429);
    assert.equal((await speak(TOKEN_B)).statusCode, 200, "another learner on the same IP still has a full bucket");
    await app.close();
  });

  it("stays closed (503) when the app forgets to pass the pool", async () => {
    const app = await build(undefined);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/audio/speak",
      headers: { authorization: `Bearer ${TOKEN_A}` },
      payload: { text: "hi", lang: "en" },
    });
    assert.equal(response.statusCode, 503);
    await app.close();
  });

  it("keys the bucket by user id and matches the course language by its base code", () => {
    assert.equal(audioRateKey({ id: "u1" }, "1.2.3.4"), "audio-user:u1");
    assert.equal(audioRateKey(undefined, "1.2.3.4"), "audio-ip:1.2.3.4");
    assert.equal(sameCourseLanguage("en-US", "en"), true);
    assert.equal(sameCourseLanguage("pt-BR", "en"), false);
    assert.equal(sameCourseLanguage(undefined, "en"), false);
  });
});

