import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMailChannel, type MailChannelEnv } from "../src/services/mailer.ts";

const empty: MailChannelEnv = {
  MAILJET_API_KEY: "",
  MAILJET_API_SECRET: "",
  RESEND_API_KEY: "",
  BREVO_API_KEY: "",
  SMTP_HOST: "",
};

describe("mail channel", () => {
  it("prefers Mailjet over Mailpit and the other APIs", () => {
    assert.equal(
      resolveMailChannel({
        ...empty,
        MAILJET_API_KEY: "key",
        MAILJET_API_SECRET: "secret",
        RESEND_API_KEY: "re_test",
        SMTP_HOST: "mailpit",
      }),
      "mailjet",
    );
  });

  it("uses Resend when Mailjet is incomplete", () => {
    assert.equal(
      resolveMailChannel({ ...empty, MAILJET_API_KEY: "key", RESEND_API_KEY: "re_test", SMTP_HOST: "mailpit" }),
      "resend",
    );
  });

  it("uses Brevo when Resend is empty", () => {
    assert.equal(resolveMailChannel({ ...empty, BREVO_API_KEY: "xkeysib-test", SMTP_HOST: "mailpit" }), "brevo");
  });

  it("falls back to SMTP when no API key is set", () => {
    assert.equal(resolveMailChannel({ ...empty, SMTP_HOST: "mailpit" }), "smtp");
    assert.equal(resolveMailChannel(empty), "none");
  });
});
