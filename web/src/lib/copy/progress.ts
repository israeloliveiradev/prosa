import type { DisplayLocale } from "@/lib/i18n";
import { areaCopy, defineArea, useAreaCopy } from "@/lib/copy/area";

/** Conquistas derivadas de ações reais (ver `BADGES` e `withBadges` em `@/lib/progress`). */
export type BadgeCode = "first_flame" | "streak_3" | "streak_7" | "words_10" | "clear_voice" | "journal_kept";

export const BADGE_CODES: readonly BadgeCode[] = ["first_flame", "streak_3", "streak_7", "words_10", "clear_voice", "journal_kept"];

interface BadgeText {
  name: string;
  description: string;
}

type ProgressCopy = {
  badgeEarned: string;
  badgeLocked: string;
  badges: Record<BadgeCode, BadgeText>;
};

export const PROGRESS_COPY = defineArea<ProgressCopy>({
  pt: {
    badgeEarned: "Conquistada",
    badgeLocked: "Bloqueada",
    badges: {
      first_flame: { name: "Primeira fogueira", description: "Conclua uma sessão de 20 minutos." },
      streak_3: { name: "Três dias", description: "Estude 3 dias seguidos." },
      streak_7: { name: "Semana inteira", description: "Estude 7 dias seguidos." },
      words_10: { name: "Dez palavras", description: "Leve 10 palavras à memória de longo prazo." },
      clear_voice: { name: "Voz clara", description: "Acerte 90% ou mais numa frase falada." },
      journal_kept: { name: "Diário aberto", description: "Envie o diário do dia." },
    },
  },
  en: {
    badgeEarned: "Earned",
    badgeLocked: "Locked",
    badges: {
      first_flame: { name: "First fire", description: "Finish a 20-minute session." },
      streak_3: { name: "Three days", description: "Study 3 days in a row." },
      streak_7: { name: "A whole week", description: "Study 7 days in a row." },
      words_10: { name: "Ten words", description: "Move 10 words into long-term memory." },
      clear_voice: { name: "Clear voice", description: "Score 90% or more on a spoken sentence." },
      journal_kept: { name: "Journal open", description: "Submit the day's journal." },
    },
  },
  de: {
    badgeEarned: "Erreicht",
    badgeLocked: "Gesperrt",
    badges: {
      first_flame: { name: "Erstes Feuer", description: "Schließe eine 20-Minuten-Sitzung ab." },
      streak_3: { name: "Drei Tage", description: "Lerne 3 Tage hintereinander." },
      streak_7: { name: "Eine ganze Woche", description: "Lerne 7 Tage hintereinander." },
      words_10: { name: "Zehn Wörter", description: "Bring 10 Wörter ins Langzeitgedächtnis." },
      clear_voice: { name: "Klare Stimme", description: "Erreiche 90 % oder mehr bei einem gesprochenen Satz." },
      journal_kept: { name: "Tagebuch offen", description: "Reiche den Tagebucheintrag des Tages ein." },
    },
  },
  fr: {
    badgeEarned: "Obtenu",
    badgeLocked: "Verrouillé",
    badges: {
      first_flame: { name: "Premier feu", description: "Termine une séance de 20 minutes." },
      streak_3: { name: "Trois jours", description: "Étudie 3 jours d'affilée." },
      streak_7: { name: "Une semaine entière", description: "Étudie 7 jours d'affilée." },
      words_10: { name: "Dix mots", description: "Fais entrer 10 mots dans ta mémoire à long terme." },
      clear_voice: { name: "Voix claire", description: "Obtiens 90 % ou plus sur une phrase prononcée." },
      journal_kept: { name: "Journal ouvert", description: "Envoie le journal du jour." },
    },
  },
  es: {
    badgeEarned: "Conseguida",
    badgeLocked: "Bloqueada",
    badges: {
      first_flame: { name: "Primera hoguera", description: "Completa una sesión de 20 minutos." },
      streak_3: { name: "Tres días", description: "Estudia 3 días seguidos." },
      streak_7: { name: "Semana completa", description: "Estudia 7 días seguidos." },
      words_10: { name: "Diez palabras", description: "Lleva 10 palabras a la memoria a largo plazo." },
      clear_voice: { name: "Voz clara", description: "Logra un 90 % o más en una frase hablada." },
      journal_kept: { name: "Diario abierto", description: "Envía el diario del día." },
    },
  },
  it: {
    badgeEarned: "Ottenuto",
    badgeLocked: "Bloccato",
    badges: {
      first_flame: { name: "Primo fuoco", description: "Completa una sessione di 20 minuti." },
      streak_3: { name: "Tre giorni", description: "Studia 3 giorni di fila." },
      streak_7: { name: "Settimana intera", description: "Studia 7 giorni di fila." },
      words_10: { name: "Dieci parole", description: "Porta 10 parole nella memoria a lungo termine." },
      clear_voice: { name: "Voce chiara", description: "Ottieni il 90% o più in una frase pronunciata." },
      journal_kept: { name: "Diario aperto", description: "Invia il diario del giorno." },
    },
  },
  ja: {
    badgeEarned: "獲得済み",
    badgeLocked: "未獲得",
    badges: {
      first_flame: { name: "はじめての火", description: "20分のセッションを1回終える。" },
      streak_3: { name: "3日間", description: "3日続けて学習する。" },
      streak_7: { name: "まる1週間", description: "7日続けて学習する。" },
      words_10: { name: "10語", description: "10語を長期記憶に定着させる。" },
      clear_voice: { name: "クリアな声", description: "話した文で90%以上を取る。" },
      journal_kept: { name: "日記をひらく", description: "その日の日記を提出する。" },
    },
  },
});

export function badgeCopy(code: BadgeCode, locale: DisplayLocale): BadgeText {
  return areaCopy(PROGRESS_COPY, locale).badges[code];
}

export function useProgressCopy(): ProgressCopy {
  return useAreaCopy(PROGRESS_COPY);
}
