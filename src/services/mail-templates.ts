/** Idioma de interface da conta (`users.display_locale`). */
export type MailLocale = "pt" | "en" | "de" | "fr" | "es" | "it" | "ja";
/** Idiomas com carta própria. */
export type MailCopyLocale = "pt" | "en";

/** Só pt e en têm carta escrita; de, fr, es, it e ja (e qualquer valor desconhecido) recebem a carta em inglês. */
export function mailCopyLocale(locale: string | null | undefined): MailCopyLocale {
  return locale === "pt" ? "pt" : "en";
}
export type MailKind = "reset" | "email-change" | "login" | "enable-email" | "reminder" | "verify";

export interface BrandedMail {
  subject: string;
  text: string;
  html: string;
}

const SANS = "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Newsreader', Georgia, serif";

const COPY = {
  pt: {
    reset: {
      subject: "Seu código de acesso Prosa",
      kicker: "Acesso Seguro",
      title: "Seu código de acesso",
      body: "Você solicitou acesso à sua conta no Prosa. Digite os 6 dígitos abaixo na tela de login para continuar seu ritual diário de fluência:",
      action: "O código expira em 15 minutos por segurança.",
    },
    "email-change": {
      subject: "Confirme seu novo e-mail da Prosa",
      kicker: "Novo e-mail",
      title: "Confirme o endereço.",
      body: "Para passar seus estudos para este e-mail, digite o código de verificação abaixo:",
      action: "O código expira em 15 minutos por segurança.",
    },
    login: {
      subject: "Seu código de acesso único",
      kicker: "Entrar sem senha",
      title: "Aqui está seu código de acesso.",
      body: "Recebemos uma solicitação para entrar na sua conta Prosa. Digite os 6 dígitos abaixo na tela de login para continuar seu ritual diário de fluência:",
      action: "O código expira em 15 minutos por segurança.",
    },
    "enable-email": {
      subject: "Ligar autenticação por e-mail",
      kicker: "Segurança",
      title: "Confirmação de acesso",
      body: "Confirme este código para ativar a verificação de e-mail na sua conta:",
      action: "O código expira em 15 minutos por segurança.",
    },
    reminder: {
      subject: "Os seus 20 minutos estão prontos 🔥",
      kicker: "Ritual do dia",
      title: "A prosa de hoje espera.",
      body: "Revisão FSRS, treino de ritmo, leitura contextual e fala. Vinte minutos focados. Mantenha sua ofensiva viva!",
      action: "Se já concluiu a lição de hoje, ignore este aviso.",
    },
    verify: {
      subject: "Valide sua conta da Prosa 🚀",
      kicker: "Bem-vindo ao Prosa",
      title: "Confirme que é você.",
      body: "Sua jornada de fluência começa agora. Digite os 6 dígitos abaixo para ativar sua conta e iniciar seu ritual diário de idiomas:",
      action: "O código expira em 15 minutos por segurança.",
    },
    footer: "20 minutos por dia. Fluência real através de outro idioma.",
    codeLabel: "Seu código de 6 dígitos",
    ignore: "Se você não pediu este código, pode ignorar este e-mail: sem ele, o pedido não vai adiante.",
    accountLabel: "Conta",
    openLabel: "Abrir o Prosa",
    signoff: "Bons estudos,\nEquipe Prosa & Mentores Históricos",
  },
  en: {
    reset: {
      subject: "Your Prosa access code",
      kicker: "Secure Access",
      title: "Your access code",
      body: "You requested access to your Prosa account. Enter the 6-digit code below to continue your daily fluency ritual:",
      action: "This code expires in 15 minutes for your security.",
    },
    "email-change": {
      subject: "Confirm your new Prosa email",
      kicker: "New Email",
      title: "Confirm your address.",
      body: "To transfer your learning profile to this email, enter the verification code below:",
      action: "This code expires in 15 minutes for your security.",
    },
    login: {
      subject: "Your single access code",
      kicker: "Passwordless Sign-In",
      title: "Here is your access code.",
      body: "We received a sign-in request for your Prosa account. Enter the 6-digit code below on the login screen to continue your daily ritual:",
      action: "This code expires in 15 minutes for your security.",
    },
    "enable-email": {
      subject: "Turn on email verification",
      kicker: "Security",
      title: "Access confirmation",
      body: "Confirm this code to enable email verification on your account:",
      action: "This code expires in 15 minutes for your security.",
    },
    reminder: {
      subject: "Your 20 minutes are waiting 🔥",
      kicker: "Daily Ritual",
      title: "Today's Prosa is ready.",
      body: "Spaced repetition review, rhythm training, contextual reading, and speaking. Keep your streak alive!",
      action: "If you already studied today, ignore this note.",
    },
    verify: {
      subject: "Confirm your Prosa account 🚀",
      kicker: "Welcome to Prosa",
      title: "Confirm it's you.",
      body: "Your fluency journey begins today. Enter the 6-digit code below to activate your account and start your ritual:",
      action: "This code expires in 15 minutes for your security.",
    },
    footer: "20 minutes a day. Real fluency learned through another language.",
    codeLabel: "Your 6-digit code",
    ignore: "If you didn't ask for this code, you can ignore this email: without it, the request goes nowhere.",
    accountLabel: "Account",
    openLabel: "Open Prosa",
    signoff: "Happy learning,\nThe Prosa Team & Historical Mentors",
  },
} as const;

export function brandedMail(input: {
  locale: MailLocale;
  kind: MailKind;
  name?: string;
  code?: string;
  email?: string;
  magicUrl?: string;
}): BrandedMail {
  const lang = mailCopyLocale(input.locale);
  const locale = COPY[lang];
  const piece = locale[input.kind];
  const name = escapeHtml((input.name ?? "").trim());
  const greeting = name
    ? lang === "en"
      ? `Hello, ${name}!`
      : `Olá, ${name}!`
    : lang === "en"
      ? "Hello!"
      : "Olá!";
  const code = input.code ? escapeHtml(input.code) : "";
  const codeFormatted = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  const accountLine = input.email ? `${locale.accountLabel}: ${input.email}` : "";

  const fullSubject = codeFormatted
    ? `${piece.subject}: ${codeFormatted}`
    : piece.subject;

  const text = [
    greeting,
    piece.body,
    accountLine,
    code ? `${locale.codeLabel}: ${code} (${codeFormatted})` : "",
    piece.action,
    input.magicUrl ? `${locale.openLabel}: ${input.magicUrl}` : "",
    code ? locale.ignore : "",
    locale.signoff,
    locale.footer,
  ]
    .filter(Boolean)
    .join("\n\n");

  const codePlateHtml = code
    ? codePlate(code, locale.codeLabel, piece.action)
    : "";
  // Sem código, o aviso de "expira em…" ainda vale como nota final (ex.: lembrete).
  const actionHtml = code
    ? ""
    : `<tr><td style="padding:0 36px 16px;"><p style="margin:0;font:600 13px/1.5 ${SANS};color:#78716C;">${escapeHtml(piece.action)}</p></td></tr>`;
  const openHtml = input.magicUrl
    ? `<tr>
        <td align="center" style="padding:12px 36px 28px;">
          <a href="${escapeHtml(input.magicUrl)}" style="display:inline-block;padding:15px 32px;background-color:#0D9488;border-radius:16px;font:800 15px/1 ${SANS};color:#FFFFFF;text-decoration:none;box-shadow:0 4px 0 #0F766E;">
            ${escapeHtml(locale.openLabel)}
          </a>
        </td>
      </tr>`
    : "";
  const accountHtml = accountLine
    ? `<p style="margin:0 0 20px;font:600 13px/1.5 ${SANS};color:#78716C;">${escapeHtml(locale.accountLabel)}: <strong style="color:#1C1917;">${escapeHtml(input.email ?? "")}</strong></p>`
    : "";
  const ignoreHtml = code
    ? `<p style="margin:0 0 16px;font:500 12px/1.6 ${SANS};color:#A8A29E;">${escapeHtml(locale.ignore)}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(fullSubject)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { background-color: #F4F1EA; font-family: ${SANS}; color: #1C1917; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body style="margin:0;padding:24px 12px;background-color:#F4F1EA;font-family:${SANS};color:#1C1917;">
  <div style="max-width:620px;margin:0 auto;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FDFBF7;border:2px solid #E7E5E4;border-radius:24px;box-shadow:0 12px 32px rgba(28,25,23,0.06),0 4px 0 #E2DDD2;overflow:hidden;">

      <!-- Marca -->
      <tr>
        <td style="padding:28px 36px 20px;border-bottom:1px solid #E7E5E4;background:linear-gradient(180deg,#FAF6EE 0%,#FDFBF7 100%);">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;width:48px;">
                <div style="width:44px;height:44px;background-color:#18181B;border-radius:12px;box-shadow:0 3px 0 #09090B;border:1px solid #2E2E33;text-align:center;line-height:44px;">
                  <svg width="24" height="24" viewBox="0 0 64 64" fill="none" style="vertical-align:middle;display:inline-block;">
                    <rect x="18" y="16" width="7" height="26" rx="3.5" fill="#FFFFFF"/>
                    <path d="M22 16H36C42.0751 16 47 20.9249 47 27C47 33.0751 42.0751 38 36 38H22V16Z" fill="#FFFFFF"/>
                    <path d="M25 21H35.5C38.5376 21 41 23.4624 41 26.5C41 29.5376 38.5376 32 35.5 32H25V21Z" fill="#18181B"/>
                    <polygon points="18,40 21.5,46 25,40" fill="#E2E8F0"/>
                    <circle cx="47" cy="16" r="4" fill="#0D9488"/>
                  </svg>
                </div>
              </td>
              <td style="vertical-align:middle;padding-left:14px;">
                <span style="font:900 22px/1 ${SANS};letter-spacing:0.08em;color:#1C1917;display:block;">PROSA</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Corpo -->
      <tr>
        <td style="padding:32px 36px 16px;">
          <p style="margin:0 0 6px;font:700 11px/1 ${SANS};letter-spacing:0.08em;text-transform:uppercase;color:#78716C;">
            ${escapeHtml(piece.kicker)}
          </p>
          <h1 style="margin:0 0 14px;font:500 28px/1.25 ${SERIF};color:#1C1917;letter-spacing:-0.01em;">
            ${greeting} ${escapeHtml(piece.title)}
          </h1>
          <p style="margin:0 0 16px;font:500 15px/1.65 ${SANS};color:#57534E;">
            ${escapeHtml(piece.body)}
          </p>
          ${accountHtml}
        </td>
      </tr>

      ${codePlateHtml}
      ${actionHtml}
      ${openHtml}

      <tr>
        <td style="padding:0 36px 24px;">
          ${ignoreHtml}
          <p style="margin:0;font:600 13px/1.6 ${SANS};color:#78716C;white-space:pre-line;">
            ${escapeHtml(locale.signoff)}
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:22px 36px;background-color:#F5F0E8;border-top:1px solid #E7E5E4;text-align:center;">
          <p style="margin:0;font:500 11px/1.5 ${SANS};color:#78716C;">
            ${escapeHtml(locale.footer)}
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`;

  return { subject: fullSubject, text, html };
}

function codePlate(code: string, label: string, actionNote: string): string {
  const digits = code.split("");
  const leftThree = digits.slice(0, 3);
  const rightThree = digits.slice(3, 6);

  const makeCells = (subDigits: string[]) =>
    subDigits
      .map(
        (digit) =>
          `<td align="center" style="width:48px;height:58px;background-color:#FFFFFF;border:1px solid #E7E5E4;border-bottom:3px solid #D6D3CD;border-radius:12px;font:900 28px/1 ${SANS};color:#1C1917;box-shadow:0 3px 0 #D6D3CD;">${digit}</td>`,
      )
      .join('<td style="width:8px;"></td>');

  return `
    <tr>
      <td style="padding:0 36px 16px;">
        <div style="background-color:#F5F0E8;border:1px solid #E7E2D8;border-radius:18px;padding:24px 20px;text-align:center;">
          <p style="margin:0 0 12px;font:800 11px/1 ${SANS};letter-spacing:0.08em;text-transform:uppercase;color:#78716C;">
            ${escapeHtml(label)}
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
            <tr>
              ${makeCells(leftThree)}
              <td align="center" style="width:28px;font:900 20px/1 ${SANS};color:#A8A29E;">—</td>
              ${makeCells(rightThree)}
            </tr>
          </table>
          <p style="margin:14px 0 0;font:600 12px/1.4 ${SANS};color:#78716C;">
            ⏱️ ${escapeHtml(actionNote)}
          </p>
        </div>
      </td>
    </tr>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
