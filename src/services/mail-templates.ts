export type MailLocale = "pt" | "en";
export type MailKind = "reset" | "email-change" | "login" | "enable-email" | "reminder" | "verify";

export interface BrandedMail {
  subject: string;
  text: string;
  html: string;
}

const LOGO = `<svg width="32" height="36" viewBox="0 0 44 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14 10c16-1 24 5 24 12s-8 13-24 11" fill="none" stroke="#1C1917" stroke-linecap="round" stroke-width="1.5"/>
  <path d="M20 17c8 .4 11 2.6 11 5.2s-3 4.6-11 5" fill="none" stroke="#1C1917" stroke-linecap="round" stroke-width="1.15"/>
  <path d="M14 10v23" stroke="#1C1917" stroke-linecap="round" stroke-width="1.5"/>
  <path d="M11.2 32.2h5.6V42L14 46l-2.8-4V32.2z" fill="#9A3412"/>
</svg>`;

const COPY = {
  pt: {
    reset: {
      subject: "O seu código da Prosa",
      kicker: "Redefinir senha",
      title: "Um código, quinze minutos.",
      body: "Alguém pediu para escolher uma senha nova nesta conta. Use o código abaixo na Prosa. Se não foi você, ignore esta carta.",
      action: "O código expira em 15 minutos.",
    },
    "email-change": {
      subject: "Confirme o novo e-mail da Prosa",
      kicker: "Novo e-mail",
      title: "Confirme o endereço.",
      body: "Para passar a prosa para este e-mail, digite o código na tela de acesso. Se não pediu a troca, ignore.",
      action: "O código expira em 15 minutos.",
    },
    login: {
      subject: "Código de segurança da Prosa",
      kicker: "Entrar",
      title: "O segundo passo.",
      body: "Alguém está entrando na sua conta. Confirme com o código abaixo. Se não foi você, troque a senha.",
      action: "O código expira em 5 minutos.",
    },
    "enable-email": {
      subject: "Ligar o 2FA por e-mail",
      kicker: "Segurança",
      title: "Um código no correio, todo login.",
      body: "Confirme este código para passar a pedir um e-mail sempre que alguém entrar na conta.",
      action: "O código expira em 5 minutos.",
    },
    reminder: {
      subject: "Os seus vinte minutos estão prontos",
      kicker: "Edição do dia",
      title: "A prosa de hoje espera.",
      body: "Leitura, memória, fala e diário, nessa ordem. Vinte minutos. Abra a Prosa e comece quando puder.",
      action: "Se já estudou hoje, ignore este aviso.",
    },
    verify: {
      subject: "Valide a sua conta da Prosa",
      kicker: "Validar conta",
      title: "Confirme que é você.",
      body: "Alguém criou uma conta Prosa com este e-mail. Digite o código abaixo na tela para abrir a prosa. Se não foi você, ignore esta carta.",
      action: "O código expira em 15 minutos.",
    },
    footer: "Vinte minutos. Todo dia.",
    codeLabel: "O seu código",
    ignore: "A Prosa nunca pede senha por e-mail.",
    signoff: "A redação da Prosa",
  },
  en: {
    reset: {
      subject: "Your Prosa code",
      kicker: "Reset password",
      title: "One code, fifteen minutes.",
      body: "Someone asked for a new password on this account. Enter the code in Prosa. If this was not you, ignore this letter.",
      action: "The code expires in 15 minutes.",
    },
    "email-change": {
      subject: "Confirm your new Prosa email",
      kicker: "New email",
      title: "Confirm the address.",
      body: "To move Prosa to this email, enter the code on the access screen. If you did not ask, ignore this.",
      action: "The code expires in 15 minutes.",
    },
    login: {
      subject: "Your Prosa security code",
      kicker: "Sign in",
      title: "The second step.",
      body: "Someone is signing in to your account. Confirm with the code below. If this was not you, change your password.",
      action: "The code expires in 5 minutes.",
    },
    "enable-email": {
      subject: "Turn on email 2FA",
      kicker: "Security",
      title: "A code in the inbox, every sign-in.",
      body: "Confirm this code to ask for an email whenever someone signs in.",
      action: "The code expires in 5 minutes.",
    },
    reminder: {
      subject: "Your twenty minutes are ready",
      kicker: "Today's edition",
      title: "Today's Prosa is waiting.",
      body: "Reading, memory, speech and journal, in that order. Twenty minutes. Open Prosa when you can.",
      action: "If you already studied today, ignore this note.",
    },
    verify: {
      subject: "Confirm your Prosa account",
      kicker: "Verify account",
      title: "Confirm it is you.",
      body: "Someone created a Prosa account with this email. Enter the code below on the screen to open the lesson. If this was not you, ignore this letter.",
      action: "The code expires in 15 minutes.",
    },
    footer: "Twenty minutes. Every day.",
    codeLabel: "Your code",
    ignore: "Prosa never asks for your password by email.",
    signoff: "The Prosa desk",
  },
} as const;

const SANS = "'Source Sans 3',Arial,sans-serif";
const SERIF = "'Newsreader',Georgia,serif";
const PAD = "28px 36px";

export function brandedMail(input: {
  locale: MailLocale;
  kind: MailKind;
  name?: string;
  code?: string;
}): BrandedMail {
  const locale = COPY[input.locale];
  const piece = locale[input.kind];
  const name = escapeHtml((input.name ?? "").trim());
  const greeting = name
    ? input.locale === "en"
      ? `Hello, ${name}.`
      : `Olá, ${name}.`
    : input.locale === "en"
      ? "Hello."
      : "Olá.";
  const code = input.code ? escapeHtml(input.code) : "";
  const text = [
    greeting,
    piece.body,
    code ? `${locale.codeLabel}: ${code}` : "",
    piece.action,
    locale.signoff,
    locale.footer,
  ]
    .filter(Boolean)
    .join("\n\n");

  const codeRow = code
    ? `<tr>
        <td style="padding:8px 36px 12px;">
          <p style="margin:0 0 10px;font:600 12px/1.4 ${SANS};letter-spacing:0.08em;text-transform:uppercase;color:#9A3412;">${locale.codeLabel}</p>
          ${codePlate(code)}
        </td>
      </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(piece.subject)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:wght@600&amp;family=Source+Sans+3:wght@400;600&amp;display=swap"/>
</head>
<body style="margin:0;padding:0;background:#FFF8F1;color:#1C1917;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(piece.subject)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFF8F1;">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #E4D2C8;border-radius:28px;overflow:hidden;">
          <tr>
            <td style="padding:28px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">${LOGO}</td>
                  <td style="vertical-align:middle;font:600 26px/1.2 ${SERIF};color:#1C1917;">Prosa</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:${PAD};">
              <p style="margin:0 0 8px;font:600 12px/1.4 ${SANS};letter-spacing:0.08em;text-transform:uppercase;color:#9A3412;">${escapeHtml(piece.kicker)}</p>
              <h1 style="margin:0 0 18px;font:600 30px/1.3 ${SERIF};color:#1C1917;">${escapeHtml(piece.title)}</h1>
              <p style="margin:0 0 10px;font:400 16px/1.65 ${SANS};color:#1C1917;">${greeting}</p>
              <p style="margin:0;font:400 16px/1.7 ${SANS};color:#57534E;">${escapeHtml(piece.body)}</p>
            </td>
          </tr>
          ${codeRow}
          <tr>
            <td style="padding:8px 36px 32px;">
              <p style="margin:0 0 20px;font:400 15px/1.65 ${SANS};color:#57534E;">${escapeHtml(piece.action)}</p>
              <p style="margin:0;font:600 18px/1.4 ${SERIF};color:#1C1917;">${escapeHtml(locale.signoff)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px;background:#9A3412;">
              <p style="margin:0;font:600 16px/1.4 ${SERIF};color:#FFFFFF;">${escapeHtml(locale.footer)}</p>
              <p style="margin:8px 0 0;font:400 13px/1.55 ${SANS};color:#F8D9C8;">${escapeHtml(locale.ignore)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: piece.subject, text, html };
}

function codePlate(code: string): string {
  const cells = code
    .split("")
    .map(
      (digit) =>
        `<td align="center" style="padding:18px 2px;font:600 28px/1.2 ${SANS};color:#1C1917;">${digit}</td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFF8F1;border:1px solid #E4D2C8;border-radius:16px;">
    <tr>${cells}</tr>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
