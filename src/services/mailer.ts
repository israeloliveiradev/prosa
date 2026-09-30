import type { Env } from "../config.js";
import { smtpEnvelopeAddress } from "../security/smtp-address.js";
import { sendSmtp } from "./smtp.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type MailChannel = "mailjet" | "resend" | "brevo" | "smtp" | "none";

export type MailChannelEnv = Pick<
  Env,
  "MAILJET_API_KEY" | "MAILJET_API_SECRET" | "RESEND_API_KEY" | "BREVO_API_KEY" | "SMTP_HOST"
>;

export function resolveMailChannel(env: MailChannelEnv): MailChannel {
  if (env.MAILJET_API_KEY.trim() && env.MAILJET_API_SECRET.trim()) {
    return "mailjet";
  }
  if (env.RESEND_API_KEY.trim()) {
    return "resend";
  }
  if (env.BREVO_API_KEY.trim()) {
    return "brevo";
  }
  if (env.SMTP_HOST.trim()) {
    return "smtp";
  }
  return "none";
}

function senderName(from: string): string {
  const match = from.match(/^(.*)<[^>]+>$/);
  const name = match?.[1]?.replace(/^"|"$/g, "").trim();
  return name || "Prosa";
}

export class Mailer {
  constructor(private readonly env: Env) {}

  configured(): boolean {
    return resolveMailChannel(this.env) !== "none";
  }

  inboxUrl(): string | null {
    if (resolveMailChannel(this.env) !== "smtp") {
      return null;
    }
    if (this.env.SMTP_HOST === "mailpit") {
      return "http://localhost:8025";
    }
    return this.env.MAIL_INBOX_URL.trim() || null;
  }

  async send(message: MailMessage): Promise<boolean> {
    const from = this.env.MAIL_FROM.includes("@") ? this.env.MAIL_FROM : "Prosa <prosa@local.test>";
    const channel = resolveMailChannel(this.env);
    if (channel === "mailjet") {
      try {
        const token = Buffer.from(`${this.env.MAILJET_API_KEY}:${this.env.MAILJET_API_SECRET}`).toString("base64");
        const response = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            Authorization: `Basic ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: smtpEnvelopeAddress(from), Name: senderName(from) },
                To: [{ Email: smtpEnvelopeAddress(message.to) }],
                Subject: message.subject,
                TextPart: message.text,
                HTMLPart: message.html ?? message.text,
              },
            ],
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
    if (channel === "resend") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html ?? message.text,
        }),
      });
      return response.ok;
    }
    if (channel === "brevo") {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: smtpEnvelopeAddress(from), name: senderName(from) },
          to: [{ email: smtpEnvelopeAddress(message.to) }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html ?? message.text,
        }),
      });
      return response.ok;
    }
    if (channel === "smtp") {
      return sendSmtp({
        host: this.env.SMTP_HOST,
        port: this.env.SMTP_PORT,
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    }
    return false;
  }
}
