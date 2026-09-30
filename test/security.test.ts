import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadEnv } from "../src/config.ts";
import { AppError, publicErrorMessage } from "../src/http/errors.ts";
import { escapeLike } from "../src/security/like.ts";
import { isAllowedNewsUrl } from "../src/security/news-url.ts";
import { isAllowedOrigin, publicInboxUrl } from "../src/security/origins.ts";
import { isAllowedReturnUrl } from "../src/security/return-url.ts";
import { assertSmtpAddress, smtpEnvelopeAddress } from "../src/security/smtp-address.ts";

const env = loadEnv({
  POSTGRES_USER: "prosa",
  POSTGRES_PASSWORD: "x",
  POSTGRES_DB: "prosa",
  REDIS_PASSWORD: "x",
  APP_PUBLIC_URL: "http://localhost:8081",
  CORS_ORIGINS: "https://prosa.example",
});

describe("checkout return URLs", () => {
  it("keeps the local paywall and the native prosa scheme", () => {
    assert.equal(isAllowedReturnUrl("http://localhost:8081/paywall", env), true);
    assert.equal(isAllowedReturnUrl("http://127.0.0.1:8081/paywall", env), true);
    assert.equal(isAllowedReturnUrl("prosa://paywall", env), true);
  });

  it("rejects an open redirect and credentials in the URL", () => {
    assert.equal(isAllowedReturnUrl("https://evil.example/paywall", env), false);
    assert.equal(isAllowedReturnUrl("http://localhost:8081/paywall", env), true);
    assert.equal(isAllowedReturnUrl("https://prosa.example/paywall", env), true);
    assert.equal(isAllowedReturnUrl("javascript:alert(1)", env), false);
  });
});

describe("CORS origins", () => {
  it("allows the app origin, local Expo, extras, and requests without Origin", () => {
    assert.equal(isAllowedOrigin(undefined, env), true);
    assert.equal(isAllowedOrigin("http://localhost:8081", env), true);
    assert.equal(isAllowedOrigin("https://prosa.example", env), true);
    assert.equal(isAllowedOrigin("https://evil.example", env), false);
  });
});

describe("SMTP envelope", () => {
  it("reads the address inside the angle brackets", () => {
    assert.equal(smtpEnvelopeAddress("Prosa <prosa@local.test>"), "prosa@local.test");
  });

  it("rejects CR LF in MAIL FROM and RCPT TO", () => {
    assert.throws(() => smtpEnvelopeAddress("prosa@local.test\r\nBCC: thief@evil.example"));
    assert.throws(() => assertSmtpAddress("ok@x.test\nRCPT TO:<thief@evil.example>"));
  });
});

describe("admin LIKE", () => {
  it("escapes percent and underscore so a search cannot match every row", () => {
    assert.equal(escapeLike("a%b_c"), "a\\%b\\_c");
  });
});

describe("news feed hosts", () => {
  it("allows only the HTTPS catalogs the product already uses", () => {
    assert.equal(isAllowedNewsUrl("https://news.google.com/rss?hl=en-US"), true);
    assert.equal(isAllowedNewsUrl("https://feeds.bbci.co.uk/news/world/rss.xml"), true);
    assert.equal(isAllowedNewsUrl("http://127.0.0.1:3000/health"), false);
    assert.equal(isAllowedNewsUrl("https://evil.example/rss.xml"), false);
  });
});

describe("inbox URL", () => {
  it("only returns a Mailpit address on loopback", () => {
    assert.equal(publicInboxUrl("http://localhost:8025"), "http://localhost:8025");
    assert.equal(publicInboxUrl("https://mail.evil.example"), null);
  });
});

describe("error leakage", () => {
  it("hides 5xx text that looks like a secret", () => {
    assert.equal(publicErrorMessage(new AppError(400, "Invalid credentials"), 400), "Invalid credentials");
    assert.equal(publicErrorMessage(new AppError(503, "Mail is not configured"), 503), "Mail is not configured");
    assert.equal(publicErrorMessage(new AppError(502, "gsk_ABCDEF123 leaked"), 502), "Internal server error");
    assert.equal(publicErrorMessage(new AppError(502, "Provider timed out after 12s on model xyz"), 502), "Internal server error");
    assert.equal(publicErrorMessage(new Error("ECONNREFUSED postgres://"), 500), "Internal server error");
  });
});
