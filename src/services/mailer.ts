import type { Env } from "../config.js";
import { sendSmtp } from "./smtp.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class Mailer {
  constructor(private readonly env: Env) {}

  configured(): boolean {
    return Boolean(this.env.SMTP_HOST || this.env.RESEND_API_KEY.trim() || this.env.BREVO_API_KEY.trim());
  }

  inboxUrl(): string | null {
    if (this.env.SMTP_HOST === "mailpit") {
      return "http://localhost:8025";
    }
    return this.env.MAIL_INBOX_URL.trim() || null;
  }

  async send(message: MailMessage): Promise<boolean> {
    const from = this.env.MAIL_FROM.includes("@") ? this.env.MAIL_FROM : "Prosa <prosa@local.test>";
    if (this.env.SMTP_HOST) {
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
    if (this.env.BREVO_API_KEY.trim()) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: from.match(/<([^>]+)>/)?.[1] ?? from, name: "Prosa" },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html ?? message.text,
        }),
      });
      return response.ok;
    }
    if (this.env.RESEND_API_KEY.trim()) {
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
    return false;
  }
}
