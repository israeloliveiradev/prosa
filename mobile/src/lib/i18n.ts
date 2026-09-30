import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import { MESSAGES } from "@/lib/messages";

export type DisplayLocale = "pt" | "en";

const STORAGE_KEY = "prosa.locale.v1";

const COPY = {
  pt: {
    navHome: "Início",
    navMemory: "Memória",
    navNews: "Notícias",
    navPractice: "Prática",
    navLesson: "Lição",
    navPro: "Pro",
    account: "Conta",
    settings: "Perfil e configurações",
    guide: "Como usar",
    signOut: "Sair",
    signIn: "Entrar",
    language: "Idioma de estudo",
    logoHome: "Início, Prosa",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    greeting: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed.toLowerCase() === "você") {
        return "Que bom ver você";
      }
      return `Que bom ver você, ${trimmed}`;
    },
    todayKicker: "Hoje",
    todayTitle: "A lição de vinte minutos",
    todayReady: "Einstein lê, Curie guarda, Feynman fala e Leonardo escreve.",
    continueToday: "Continuar a lição",
    startToday: "Começar a lição",
    reviewEmpty: "Faça uma lição para continuar construindo sua lista de vocabulário.",
    settingsProfile: "Perfil",
    settingsAccess: "Acesso",
    settingsLocale: "Idioma da tela",
    settingsSecurity: "Segurança",
    settingsReminders: "Lembretes",
    settingsCast: "Elenco",
    passwordSection: "Senha",
    emailSection: "E-mail da conta",
    passwordDek: "Troca a senha com a atual e a nova, no mínimo 8 caracteres.",
    emailDek: "O código chega no endereço novo. A senha atual confirma que é você.",
    securityDek: "O autenticador e o e-mail pedem um segundo passo no login.",
    profileDek: "Como a Prosa te chama, e o tema desta tela.",
    castDek: "Quatro mentes. Cada uma com a personalidade delas, no papel da lição.",
    houseCast: "Elenco histórico",
    displayName: "Nome de exibição",
    displayNameHint: "É assim que a Prosa te cumprimenta.",
    theme: "Tema do perfil",
    themeLight: "Claro",
    themeDark: "Escuro",
    currentPassword: "Senha atual",
    newPassword: "Senha nova",
    changePassword: "Guardar senha nova",
    forgot: "Esqueci a senha",
    forgotHint: "Enviamos um código de 6 dígitos para o e-mail da conta.",
    sendReset: "Enviar o código",
    resetTitle: "Escolher senha nova",
    resetSave: "Redefinir senha",
    resetCode: "Código de 6 dígitos",
    localeHint: "Muda os menus e os avisos. A lição continua no idioma que você estuda.",
    reminderHint: "Um e-mail no horário escolhido, se a lição do dia ainda não abriu.",
    reminderOn: "Lembrar da lição",
    reminderHour: "Horário (UTC)",
    mailOff: "O código chega no e-mail da conta. Confira a caixa de entrada e o spam.",
    mailBox: "Abrir a caixa de e-mail",
    showPassword: "Mostrar senha",
    hidePassword: "Ocultar senha",
    saved: "Guardado.",
    saveName: "Guardar nome",
    admin: "Administração",
    newEmail: "E-mail novo",
    sendEmailCode: "Enviar código para o e-mail novo",
    confirmEmail: "Confirmar e-mail",
    twoFactor: "Autenticação em dois fatores",
    totpStart: "Gerar chave do autenticador",
    totpConfirm: "Confirmar o aplicativo",
    totpDisable: "Desligar o autenticador",
    totpSecret: "Chave para o autenticador",
    emailFactor: "Código por e-mail no login",
    emailFactorStart: "Enviar código para ligar",
    emailFactorConfirm: "Confirmar o 2FA por e-mail",
    emailFactorOff: "Desligar o 2FA por e-mail",
    recoveryCodes: "Guarde estes códigos. Cada um serve uma vez.",
    secondFactor: "Código de segurança",
    finishLogin: "Entrar com o código",
    verifyTitle: "Validar a conta.",
    verifyHint: "Enviamos um código de 6 dígitos para o e-mail. A conta só abre depois de confirmar.",
    verifySave: "Validar conta",
    verifyAgain: "Reenviar o código",
  },
  en: {
    navHome: "Home",
    navMemory: "Memory",
    navNews: "News",
    navPractice: "Practice",
    navLesson: "Lesson",
    navPro: "Pro",
    account: "Account",
    settings: "Profile and settings",
    guide: "How to use",
    signOut: "Sign out",
    signIn: "Sign in",
    language: "Study language",
    logoHome: "Home, Prosa",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    greeting: (name: string) => {
      const trimmed = name.trim();
      return trimmed ? `Good to see you, ${trimmed}` : "Good to see you";
    },
    todayKicker: "Today",
    todayTitle: "The twenty-minute lesson",
    todayReady: "Einstein reads, Curie keeps, Feynman speaks and Leonardo writes.",
    continueToday: "Continue the lesson",
    startToday: "Start the lesson",
    reviewEmpty: "Do a lesson to keep building your vocabulary list.",
    settingsProfile: "Profile",
    settingsAccess: "Access",
    settingsLocale: "Display language",
    settingsSecurity: "Security",
    settingsReminders: "Reminders",
    settingsCast: "Cast",
    passwordSection: "Password",
    emailSection: "Account email",
    passwordDek: "Change the password with the current one and a new one, at least 8 characters.",
    emailDek: "The code arrives at the new address. The current password confirms it is you.",
    securityDek: "The authenticator and the email ask for a second step at sign-in.",
    profileDek: "How Prosa greets you, and the theme of this screen.",
    castDek: "Four minds. Each one in their exact personality, in the role of the lesson.",
    houseCast: "Historical cast",
    displayName: "Display name",
    displayNameHint: "This is how Prosa greets you.",
    theme: "Profile theme",
    themeLight: "Light",
    themeDark: "Dark",
    currentPassword: "Current password",
    newPassword: "New password",
    changePassword: "Save new password",
    forgot: "Forgot password",
    forgotHint: "We send a 6-digit code to the account email.",
    sendReset: "Send the code",
    resetTitle: "Choose a new password",
    resetSave: "Reset password",
    resetCode: "6-digit code",
    localeHint: "Changes menus and notices. The lesson stays in the language you study.",
    reminderHint: "An email at the chosen hour if today's lesson is still closed.",
    reminderOn: "Remind me of the lesson",
    reminderHour: "Hour (UTC)",
    mailOff: "The code arrives in the account email. Check the inbox and the spam folder.",
    mailBox: "Open the inbox",
    showPassword: "Show password",
    hidePassword: "Hide password",
    saved: "Saved.",
    saveName: "Save name",
    admin: "Admin",
    newEmail: "New email",
    sendEmailCode: "Send a code to the new email",
    confirmEmail: "Confirm email",
    twoFactor: "Two-factor authentication",
    totpStart: "Create authenticator key",
    totpConfirm: "Confirm the app",
    totpDisable: "Turn off authenticator",
    totpSecret: "Authenticator key",
    emailFactor: "Email code at sign-in",
    emailFactorStart: "Send a code to enable",
    emailFactorConfirm: "Confirm email 2FA",
    emailFactorOff: "Turn off email 2FA",
    recoveryCodes: "Save these codes. Each one works once.",
    secondFactor: "Security code",
    finishLogin: "Sign in with the code",
    verifyTitle: "Confirm the account.",
    verifyHint: "We send a 6-digit code to the email. The account only opens after you confirm.",
    verifySave: "Confirm account",
    verifyAgain: "Send the code again",
  },
} as const;

let locale: DisplayLocale = "pt";
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function hydrateLocale(next?: DisplayLocale | null): DisplayLocale {
  if (next === "en" || next === "pt") {
    locale = next;
    kv.set(STORAGE_KEY, next);
    applyDocumentLocale(locale);
    emit();
    return locale;
  }
  const stored = kv.getString(STORAGE_KEY);
  locale = stored === "en" ? "en" : "pt";
  applyDocumentLocale(locale);
  return locale;
}

export function setLocale(next: DisplayLocale): void {
  locale = next;
  kv.set(STORAGE_KEY, next);
  applyDocumentLocale(locale);
  emit();
}

export function getLocale(): DisplayLocale {
  return locale;
}

export function copy(next = locale) {
  return { ...COPY[next], ...MESSAGES[next] };
}

export function useCopy() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => locale,
    () => locale,
  );
  return { ...COPY[current], ...MESSAGES[current] };
}

export function applyDocumentLocale(next = locale): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.lang = next === "en" ? "en" : "pt";
  document.title = "Prosa";
}

export function phaseName(id: "review" | "listen" | "reading" | "shadow" | "journal" | "note", next = locale): string {
  const ui = copy(next);
  if (id === "review") {
    return ui.navMemory;
  }
  if (id === "listen") {
    return ui.listenPhase;
  }
  if (id === "reading") {
    return ui.reading;
  }
  if (id === "shadow") {
    return ui.speech;
  }
  if (id === "note") {
    return ui.note;
  }
  return ui.journal;
}

export function givenName(email: string, displayName?: string | null): string {
  const named = displayName?.trim();
  if (named) {
    return named.split(/\s+/)[0] ?? named;
  }
  const local = email.split("@")[0] ?? "";
  if (!local) {
    return "";
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

hydrateLocale();
applyDocumentLocale();
