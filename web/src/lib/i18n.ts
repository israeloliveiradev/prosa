import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import { MESSAGES, type Messages } from "@/lib/messages";

export type DisplayLocale = "pt" | "en" | "de" | "fr" | "es" | "it" | "ja";

export const DISPLAY_LOCALES: readonly DisplayLocale[] = ["pt", "en", "de", "fr", "es", "it", "ja"];

export function isDisplayLocale(value: unknown): value is DisplayLocale {
  return typeof value === "string" && (DISPLAY_LOCALES as readonly string[]).includes(value);
}

/** BCP-47 usado em <html lang> e em Intl.* para cada idioma de interface. */
export const LOCALE_BCP47: Record<DisplayLocale, string> = {
  pt: "pt-BR",
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  ja: "ja",
};

const STORAGE_KEY = "prosa.locale.v1";

/** Nome vazio ou o próprio pronome ("você", "you") não entram na saudação. */
function greetingName(name: string): string {
  const trimmed = name.trim();
  const lowered = trimmed.toLowerCase();
  return lowered === "você" || lowered === "you" ? "" : trimmed;
}

const COPY_PT = {
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
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `Que bom ver você, ${who}` : "Que bom ver você";
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
  reminderHint: "Uma carta na hora UTC escolhida, se a prosa do dia ainda não começou.",
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
};

type CopyTable = typeof COPY_PT;

const COPY_EN: CopyTable = {
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
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `Good to see you, ${who}` : "Good to see you";
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
  castDek: "Four minds. Each one with their own personality, in their role in the lesson.",
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
  reminderHint: "A letter at the chosen UTC hour if today's prose has not started.",
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
};

const COPY_DE: CopyTable = {
  navHome: "Start",
  navMemory: "Gedächtnis",
  navNews: "Nachrichten",
  navPractice: "Übung",
  navLesson: "Lektion",
  navPro: "Pro",
  account: "Konto",
  settings: "Profil und Einstellungen",
  guide: "Anleitung",
  signOut: "Abmelden",
  signIn: "Anmelden",
  language: "Lernsprache",
  logoHome: "Start, Prosa",
  openMenu: "Menü öffnen",
  closeMenu: "Menü schließen",
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `Schön, dich zu sehen, ${who}` : "Schön, dich zu sehen";
  },
  todayKicker: "Heute",
  todayTitle: "Die Zwanzig-Minuten-Lektion",
  todayReady: "Einstein liest, Curie bewahrt, Feynman spricht und Leonardo schreibt.",
  continueToday: "Lektion fortsetzen",
  startToday: "Lektion beginnen",
  reviewEmpty: "Mach eine Lektion, um deine Wortliste weiter aufzubauen.",
  settingsProfile: "Profil",
  settingsAccess: "Zugang",
  settingsLocale: "Sprache der Oberfläche",
  settingsSecurity: "Sicherheit",
  settingsReminders: "Erinnerungen",
  settingsCast: "Besetzung",
  passwordSection: "Passwort",
  emailSection: "E-Mail des Kontos",
  passwordDek: "Ändere das Passwort mit dem aktuellen und einem neuen, mindestens 8 Zeichen.",
  emailDek: "Der Code kommt an die neue Adresse. Das aktuelle Passwort bestätigt, dass du es bist.",
  securityDek: "Authenticator und E-Mail verlangen beim Anmelden einen zweiten Schritt.",
  profileDek: "Wie Prosa dich nennt, und das Design dieses Bildschirms.",
  castDek: "Vier Köpfe. Jeder mit seiner eigenen Persönlichkeit, in seiner Rolle in der Lektion.",
  houseCast: "Historische Besetzung",
  displayName: "Anzeigename",
  displayNameHint: "So begrüßt dich Prosa.",
  theme: "Design des Profils",
  themeLight: "Hell",
  themeDark: "Dunkel",
  currentPassword: "Aktuelles Passwort",
  newPassword: "Neues Passwort",
  changePassword: "Neues Passwort speichern",
  forgot: "Passwort vergessen",
  forgotHint: "Wir senden einen 6-stelligen Code an die E-Mail des Kontos.",
  sendReset: "Code senden",
  resetTitle: "Neues Passwort wählen",
  resetSave: "Passwort zurücksetzen",
  resetCode: "6-stelliger Code",
  localeHint: "Ändert Menüs und Hinweise. Die Lektion bleibt in der Sprache, die du lernst.",
  reminderHint: "Eine Nachricht zur gewählten UTC-Stunde, falls die Prosa des Tages noch nicht begonnen hat.",
  reminderOn: "An die Lektion erinnern",
  reminderHour: "Uhrzeit (UTC)",
  mailOff: "Der Code kommt an die E-Mail des Kontos. Sieh im Posteingang und im Spam-Ordner nach.",
  mailBox: "Posteingang öffnen",
  showPassword: "Passwort anzeigen",
  hidePassword: "Passwort verbergen",
  saved: "Gespeichert.",
  saveName: "Namen speichern",
  admin: "Verwaltung",
  newEmail: "Neue E-Mail",
  sendEmailCode: "Code an die neue E-Mail senden",
  confirmEmail: "E-Mail bestätigen",
  twoFactor: "Zwei-Faktor-Authentifizierung",
  totpStart: "Authenticator-Schlüssel erstellen",
  totpConfirm: "App bestätigen",
  totpDisable: "Authenticator ausschalten",
  totpSecret: "Schlüssel für den Authenticator",
  emailFactor: "Code per E-Mail beim Anmelden",
  emailFactorStart: "Code zum Aktivieren senden",
  emailFactorConfirm: "2FA per E-Mail bestätigen",
  emailFactorOff: "2FA per E-Mail ausschalten",
  recoveryCodes: "Bewahre diese Codes auf. Jeder funktioniert nur einmal.",
  secondFactor: "Sicherheitscode",
  finishLogin: "Mit dem Code anmelden",
  verifyTitle: "Konto bestätigen.",
  verifyHint: "Wir senden einen 6-stelligen Code an die E-Mail. Das Konto öffnet sich erst nach der Bestätigung.",
  verifySave: "Konto bestätigen",
  verifyAgain: "Code erneut senden",
};

const COPY_FR: CopyTable = {
  navHome: "Accueil",
  navMemory: "Mémoire",
  navNews: "Actualités",
  navPractice: "Pratique",
  navLesson: "Leçon",
  navPro: "Pro",
  account: "Compte",
  settings: "Profil et réglages",
  guide: "Mode d’emploi",
  signOut: "Se déconnecter",
  signIn: "Se connecter",
  language: "Langue étudiée",
  logoHome: "Accueil, Prosa",
  openMenu: "Ouvrir le menu",
  closeMenu: "Fermer le menu",
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `Bonjour, ${who}` : "Bonjour";
  },
  todayKicker: "Aujourd’hui",
  todayTitle: "La leçon de vingt minutes",
  todayReady: "Einstein lit, Curie retient, Feynman parle et Leonardo écrit.",
  continueToday: "Continuer la leçon",
  startToday: "Commencer la leçon",
  reviewEmpty: "Faites une leçon pour continuer à enrichir votre liste de vocabulaire.",
  settingsProfile: "Profil",
  settingsAccess: "Accès",
  settingsLocale: "Langue de l’interface",
  settingsSecurity: "Sécurité",
  settingsReminders: "Rappels",
  settingsCast: "Distribution",
  passwordSection: "Mot de passe",
  emailSection: "E-mail du compte",
  passwordDek: "Changez le mot de passe avec l’actuel et un nouveau, d’au moins 8 caractères.",
  emailDek: "Le code arrive à la nouvelle adresse. Le mot de passe actuel confirme que c’est bien vous.",
  securityDek: "L’authentificateur et l’e-mail demandent une deuxième étape à la connexion.",
  profileDek: "Comment Prosa vous appelle, et le thème de cet écran.",
  castDek: "Quatre esprits. Chacun avec sa personnalité, dans son rôle de la leçon.",
  houseCast: "Distribution historique",
  displayName: "Nom affiché",
  displayNameHint: "C’est ainsi que Prosa vous salue.",
  theme: "Thème du profil",
  themeLight: "Clair",
  themeDark: "Sombre",
  currentPassword: "Mot de passe actuel",
  newPassword: "Nouveau mot de passe",
  changePassword: "Enregistrer le nouveau mot de passe",
  forgot: "Mot de passe oublié",
  forgotHint: "Nous envoyons un code à 6 chiffres à l’e-mail du compte.",
  sendReset: "Envoyer le code",
  resetTitle: "Choisir un nouveau mot de passe",
  resetSave: "Réinitialiser le mot de passe",
  resetCode: "Code à 6 chiffres",
  localeHint: "Change les menus et les messages. La leçon reste dans la langue que vous étudiez.",
  reminderHint: "Un message à l’heure UTC choisie, si la prose du jour n’a pas encore commencé.",
  reminderOn: "Me rappeler la leçon",
  reminderHour: "Heure (UTC)",
  mailOff: "Le code arrive sur l’e-mail du compte. Vérifiez la boîte de réception et les spams.",
  mailBox: "Ouvrir la boîte de réception",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  saved: "Enregistré.",
  saveName: "Enregistrer le nom",
  admin: "Administration",
  newEmail: "Nouvel e-mail",
  sendEmailCode: "Envoyer un code au nouvel e-mail",
  confirmEmail: "Confirmer l’e-mail",
  twoFactor: "Authentification à deux facteurs",
  totpStart: "Créer la clé d’authentification",
  totpConfirm: "Confirmer l’application",
  totpDisable: "Désactiver l’authentificateur",
  totpSecret: "Clé pour l’authentificateur",
  emailFactor: "Code par e-mail à la connexion",
  emailFactorStart: "Envoyer un code pour activer",
  emailFactorConfirm: "Confirmer la 2FA par e-mail",
  emailFactorOff: "Désactiver la 2FA par e-mail",
  recoveryCodes: "Gardez ces codes. Chacun ne sert qu’une fois.",
  secondFactor: "Code de sécurité",
  finishLogin: "Se connecter avec le code",
  verifyTitle: "Valider le compte.",
  verifyHint: "Nous envoyons un code à 6 chiffres par e-mail. Le compte ne s’ouvre qu’après confirmation.",
  verifySave: "Valider le compte",
  verifyAgain: "Renvoyer le code",
};

const COPY_ES: CopyTable = {
  navHome: "Inicio",
  navMemory: "Memoria",
  navNews: "Noticias",
  navPractice: "Práctica",
  navLesson: "Lección",
  navPro: "Pro",
  account: "Cuenta",
  settings: "Perfil y ajustes",
  guide: "Cómo usar",
  signOut: "Cerrar sesión",
  signIn: "Iniciar sesión",
  language: "Idioma de estudio",
  logoHome: "Inicio, Prosa",
  openMenu: "Abrir menú",
  closeMenu: "Cerrar menú",
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `Qué bueno verte, ${who}` : "Qué bueno verte";
  },
  todayKicker: "Hoy",
  todayTitle: "La lección de veinte minutos",
  todayReady: "Einstein lee, Curie guarda, Feynman habla y Leonardo escribe.",
  continueToday: "Continuar la lección",
  startToday: "Empezar la lección",
  reviewEmpty: "Haz una lección para seguir construyendo tu lista de vocabulario.",
  settingsProfile: "Perfil",
  settingsAccess: "Acceso",
  settingsLocale: "Idioma de la interfaz",
  settingsSecurity: "Seguridad",
  settingsReminders: "Recordatorios",
  settingsCast: "Elenco",
  passwordSection: "Contraseña",
  emailSection: "Correo de la cuenta",
  passwordDek: "Cambia la contraseña con la actual y una nueva, de al menos 8 caracteres.",
  emailDek: "El código llega a la nueva dirección. La contraseña actual confirma que eres tú.",
  securityDek: "El autenticador y el correo piden un segundo paso al iniciar sesión.",
  profileDek: "Cómo te llama Prosa, y el tema de esta pantalla.",
  castDek: "Cuatro mentes. Cada una con su personalidad, en su papel en la lección.",
  houseCast: "Elenco histórico",
  displayName: "Nombre visible",
  displayNameHint: "Así te saluda Prosa.",
  theme: "Tema del perfil",
  themeLight: "Claro",
  themeDark: "Oscuro",
  currentPassword: "Contraseña actual",
  newPassword: "Contraseña nueva",
  changePassword: "Guardar contraseña nueva",
  forgot: "Olvidé la contraseña",
  forgotHint: "Enviamos un código de 6 dígitos al correo de la cuenta.",
  sendReset: "Enviar el código",
  resetTitle: "Elegir contraseña nueva",
  resetSave: "Restablecer contraseña",
  resetCode: "Código de 6 dígitos",
  localeHint: "Cambia los menús y los avisos. La lección sigue en el idioma que estudias.",
  reminderHint: "Un mensaje a la hora UTC elegida, si la prosa del día todavía no empezó.",
  reminderOn: "Recordarme la lección",
  reminderHour: "Hora (UTC)",
  mailOff: "El código llega al correo de la cuenta. Revisa la bandeja de entrada y el spam.",
  mailBox: "Abrir la bandeja de entrada",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  saved: "Guardado.",
  saveName: "Guardar nombre",
  admin: "Administración",
  newEmail: "Correo nuevo",
  sendEmailCode: "Enviar código al correo nuevo",
  confirmEmail: "Confirmar correo",
  twoFactor: "Autenticación en dos pasos",
  totpStart: "Generar clave del autenticador",
  totpConfirm: "Confirmar la app",
  totpDisable: "Desactivar el autenticador",
  totpSecret: "Clave para el autenticador",
  emailFactor: "Código por correo al iniciar sesión",
  emailFactorStart: "Enviar código para activar",
  emailFactorConfirm: "Confirmar 2FA por correo",
  emailFactorOff: "Desactivar 2FA por correo",
  recoveryCodes: "Guarda estos códigos. Cada uno sirve una sola vez.",
  secondFactor: "Código de seguridad",
  finishLogin: "Entrar con el código",
  verifyTitle: "Verificar la cuenta.",
  verifyHint: "Enviamos un código de 6 dígitos al correo. La cuenta solo se abre después de confirmar.",
  verifySave: "Verificar cuenta",
  verifyAgain: "Reenviar el código",
};

const COPY_IT: CopyTable = {
  navHome: "Home",
  navMemory: "Memoria",
  navNews: "Notizie",
  navPractice: "Pratica",
  navLesson: "Lezione",
  navPro: "Pro",
  account: "Account",
  settings: "Profilo e impostazioni",
  guide: "Come si usa",
  signOut: "Esci",
  signIn: "Accedi",
  language: "Lingua di studio",
  logoHome: "Home, Prosa",
  openMenu: "Apri il menu",
  closeMenu: "Chiudi il menu",
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `Che bello vederti, ${who}` : "Che bello vederti";
  },
  todayKicker: "Oggi",
  todayTitle: "La lezione di venti minuti",
  todayReady: "Einstein legge, Curie custodisce, Feynman parla e Leonardo scrive.",
  continueToday: "Continua la lezione",
  startToday: "Inizia la lezione",
  reviewEmpty: "Fai una lezione per continuare a costruire la tua lista di vocaboli.",
  settingsProfile: "Profilo",
  settingsAccess: "Accesso",
  settingsLocale: "Lingua dell’interfaccia",
  settingsSecurity: "Sicurezza",
  settingsReminders: "Promemoria",
  settingsCast: "Cast",
  passwordSection: "Password",
  emailSection: "E-mail dell’account",
  passwordDek: "Cambia la password con quella attuale e una nuova, di almeno 8 caratteri.",
  emailDek: "Il codice arriva al nuovo indirizzo. La password attuale conferma che sei tu.",
  securityDek: "L’autenticatore e l’e-mail richiedono un secondo passaggio all’accesso.",
  profileDek: "Come ti chiama Prosa, e il tema di questa schermata.",
  castDek: "Quattro menti. Ognuna con la propria personalità, nel suo ruolo nella lezione.",
  houseCast: "Cast storico",
  displayName: "Nome visualizzato",
  displayNameHint: "È così che Prosa ti saluta.",
  theme: "Tema del profilo",
  themeLight: "Chiaro",
  themeDark: "Scuro",
  currentPassword: "Password attuale",
  newPassword: "Nuova password",
  changePassword: "Salva la nuova password",
  forgot: "Password dimenticata",
  forgotHint: "Inviamo un codice di 6 cifre all’e-mail dell’account.",
  sendReset: "Invia il codice",
  resetTitle: "Scegli una nuova password",
  resetSave: "Reimposta la password",
  resetCode: "Codice di 6 cifre",
  localeHint: "Cambia i menu e gli avvisi. La lezione resta nella lingua che studi.",
  reminderHint: "Un messaggio all’ora UTC scelta, se la prosa del giorno non è ancora iniziata.",
  reminderOn: "Ricordami la lezione",
  reminderHour: "Ora (UTC)",
  mailOff: "Il codice arriva all’e-mail dell’account. Controlla la posta in arrivo e lo spam.",
  mailBox: "Apri la posta in arrivo",
  showPassword: "Mostra password",
  hidePassword: "Nascondi password",
  saved: "Salvato.",
  saveName: "Salva il nome",
  admin: "Amministrazione",
  newEmail: "Nuova e-mail",
  sendEmailCode: "Invia un codice alla nuova e-mail",
  confirmEmail: "Conferma l’e-mail",
  twoFactor: "Autenticazione a due fattori",
  totpStart: "Genera la chiave dell’autenticatore",
  totpConfirm: "Conferma l’app",
  totpDisable: "Disattiva l’autenticatore",
  totpSecret: "Chiave per l’autenticatore",
  emailFactor: "Codice via e-mail all’accesso",
  emailFactorStart: "Invia un codice per attivare",
  emailFactorConfirm: "Conferma la 2FA via e-mail",
  emailFactorOff: "Disattiva la 2FA via e-mail",
  recoveryCodes: "Conserva questi codici. Ognuno vale una sola volta.",
  secondFactor: "Codice di sicurezza",
  finishLogin: "Accedi con il codice",
  verifyTitle: "Verifica l’account.",
  verifyHint: "Inviamo un codice di 6 cifre all’e-mail. L’account si apre solo dopo la conferma.",
  verifySave: "Verifica l’account",
  verifyAgain: "Invia di nuovo il codice",
};

const COPY_JA: CopyTable = {
  navHome: "ホーム",
  navMemory: "記憶",
  navNews: "ニュース",
  navPractice: "練習",
  navLesson: "レッスン",
  navPro: "Pro",
  account: "アカウント",
  settings: "プロフィールと設定",
  guide: "使い方",
  signOut: "ログアウト",
  signIn: "ログイン",
  language: "学習言語",
  logoHome: "ホーム、Prosa",
  openMenu: "メニューを開く",
  closeMenu: "メニューを閉じる",
  greeting: (name: string): string => {
    const who = greetingName(name);
    return who ? `${who}さん、ようこそ` : "ようこそ";
  },
  todayKicker: "今日",
  todayTitle: "20分のレッスン",
  todayReady: "アインシュタインが読み、キュリーが記憶し、ファインマンが話し、レオナルドが書きます。",
  continueToday: "レッスンを続ける",
  startToday: "レッスンを始める",
  reviewEmpty: "レッスンをして、単語リストを増やしていきましょう。",
  settingsProfile: "プロフィール",
  settingsAccess: "アクセス",
  settingsLocale: "表示言語",
  settingsSecurity: "セキュリティ",
  settingsReminders: "リマインダー",
  settingsCast: "キャスト",
  passwordSection: "パスワード",
  emailSection: "アカウントのメールアドレス",
  passwordDek: "現在のパスワードと新しいパスワード（8文字以上）で変更します。",
  emailDek: "コードは新しいアドレスに届きます。本人確認のため現在のパスワードを入力してください。",
  securityDek: "認証アプリとメールで、ログイン時に2段階目の確認を行います。",
  profileDek: "Prosa での呼び名と、この画面のテーマ。",
  castDek: "4人の偉人。それぞれの個性で、レッスンの役割を担います。",
  houseCast: "歴史上のキャスト",
  displayName: "表示名",
  displayNameHint: "Prosa はこの名前であいさつします。",
  theme: "プロフィールのテーマ",
  themeLight: "ライト",
  themeDark: "ダーク",
  currentPassword: "現在のパスワード",
  newPassword: "新しいパスワード",
  changePassword: "新しいパスワードを保存",
  forgot: "パスワードを忘れた場合",
  forgotHint: "アカウントのメールアドレスに6桁のコードを送ります。",
  sendReset: "コードを送信",
  resetTitle: "新しいパスワードを設定",
  resetSave: "パスワードを再設定",
  resetCode: "6桁のコード",
  localeHint: "メニューとお知らせの言語が変わります。レッスンは学習中の言語のままです。",
  reminderHint: "その日のストーリーをまだ始めていなければ、指定した UTC の時刻にお知らせが届きます。",
  reminderOn: "レッスンをリマインド",
  reminderHour: "時刻 (UTC)",
  mailOff: "コードはアカウントのメールアドレスに届きます。受信トレイと迷惑メールフォルダを確認してください。",
  mailBox: "受信トレイを開く",
  showPassword: "パスワードを表示",
  hidePassword: "パスワードを隠す",
  saved: "保存しました。",
  saveName: "名前を保存",
  admin: "管理",
  newEmail: "新しいメールアドレス",
  sendEmailCode: "新しいメールアドレスにコードを送信",
  confirmEmail: "メールアドレスを確認",
  twoFactor: "2段階認証",
  totpStart: "認証アプリのキーを作成",
  totpConfirm: "アプリを確認",
  totpDisable: "認証アプリをオフにする",
  totpSecret: "認証アプリ用のキー",
  emailFactor: "ログイン時のメールコード",
  emailFactorStart: "有効化のコードを送信",
  emailFactorConfirm: "メールによる2段階認証を確認",
  emailFactorOff: "メールによる2段階認証をオフにする",
  recoveryCodes: "これらのコードを保管してください。各コードは1回だけ使えます。",
  secondFactor: "セキュリティコード",
  finishLogin: "コードでログイン",
  verifyTitle: "アカウントを確認。",
  verifyHint: "メールに6桁のコードを送ります。確認が済むとアカウントが使えるようになります。",
  verifySave: "アカウントを確認",
  verifyAgain: "コードを再送信",
};

/** Textos do shell e da conta nos 7 idiomas de interface (o teste de paridade lê esta tabela). */
export const COPY: Record<DisplayLocale, CopyTable> = {
  pt: COPY_PT,
  en: COPY_EN,
  de: COPY_DE,
  fr: COPY_FR,
  es: COPY_ES,
  it: COPY_IT,
  ja: COPY_JA,
};

let locale: DisplayLocale = "pt";
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function hydrateLocale(next?: DisplayLocale | null): DisplayLocale {
  if (isDisplayLocale(next)) {
    locale = next;
    kv.set(STORAGE_KEY, next);
    applyDocumentLocale(locale);
    emit();
    return locale;
  }
  const stored = kv.getString(STORAGE_KEY);
  locale = isDisplayLocale(stored) ? stored : "pt";
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

export type UiCopy = CopyTable & Messages;

/** Tabela do idioma pedido; um idioma desconhecido cai no inglês e depois no português. */
function copyTable(next: DisplayLocale): CopyTable {
  return COPY[next] ?? COPY.en ?? COPY.pt;
}

function messageTable(next: DisplayLocale): Messages {
  return MESSAGES[next] ?? MESSAGES.en ?? MESSAGES.pt;
}

/** As tabelas são fixas: a mescla de cada idioma é feita uma vez e reaproveitada (referência estável). */
const merged = new Map<DisplayLocale, UiCopy>();

export function copy(next: DisplayLocale = locale): UiCopy {
  let table = merged.get(next);
  if (!table) {
    table = { ...copyTable(next), ...messageTable(next) };
    merged.set(next, table);
  }
  return table;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Idioma de interface atual, reativo. */
export function useLocale(): DisplayLocale {
  return useSyncExternalStore(subscribe, () => locale, () => locale);
}

export function useCopy(): UiCopy {
  return copy(useLocale());
}

export function applyDocumentLocale(next = locale): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.lang = LOCALE_BCP47[next];
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
