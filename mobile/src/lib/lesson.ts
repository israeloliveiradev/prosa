import type { LessonPayload, SessionCard, VocabularyEntry } from "@/lib/types";
import { phaseAt, sessionPhases, SESSION_SECONDS, type SessionPhase } from "@/lib/session-clock";

export { SESSION_SECONDS };

export const PHASES: SessionPhase[] = sessionPhases({ dueCount: 3 });

export function phaseForElapsed(elapsed: number, phases: SessionPhase[] = PHASES): SessionPhase["id"] {
  return phaseAt(elapsed, phases);
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function tokenize(story: string): string[] {
  return story.split(/\s+/).filter((token) => token.length > 0);
}

export function normalizeWord(token: string): string {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function findVocabulary(vocabulary: VocabularyEntry[], token: string): VocabularyEntry | undefined {
  const normalized = normalizeWord(token);
  if (!normalized) {
    return undefined;
  }
  return vocabulary.find((entry) => {
    const parts = entry.word.split(/\s+/).map(normalizeWord);
    return parts.includes(normalized) || normalizeWord(entry.word) === normalized;
  });
}

/**
 * Palavra do texto que merece destaque de vocabulário: igual a uma entrada de
 * uma palavra, ou parte (com 4+ letras) de uma expressão. Evita sublinhar todo
 * "the"/"de" só porque aparece numa expressão como "the same".
 */
export function isLessonWord(vocabulary: VocabularyEntry[], token: string): boolean {
  const normalized = normalizeWord(token);
  if (!normalized) {
    return false;
  }
  return vocabulary.some((entry) => {
    const parts = entry.word.split(/\s+/).map(normalizeWord).filter((part) => part.length > 0);
    if (parts.length <= 1) {
      return normalizeWord(entry.word) === normalized;
    }
    return [...normalized].length >= 4 && parts.includes(normalized);
  });
}

export function displayWord(token: string): string {
  return normalizeWord(token) || token.trim();
}

export function cardInDeck(cards: SessionCard[], word: string): boolean {
  const key = normalizeWord(word);
  if (!key) {
    return false;
  }
  return cards.some((card) => normalizeWord(card.front_phrase) === key);
}

export function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  return parts.length > 0 ? parts : [text.trim()].filter((sentence) => sentence.length > 0);
}

export function throughForSentence(story: string, translation: string, sentence: string): string {
  const storyParts = splitSentences(story);
  const transParts = splitSentences(translation);
  const index = storyParts.findIndex(
    (item) => item === sentence || item.includes(sentence) || sentence.includes(item),
  );
  if (index >= 0 && transParts[index]) {
    return transParts[index]!;
  }
  return translation.trim();
}

export function cardFromTap(params: {
  word: string;
  translation: string;
  sentence: string;
}): SessionCard {
  const word = displayWord(params.word);
  return {
    id: `saved-${normalizeWord(word)}`,
    front_phrase: word,
    back_translation: params.translation,
    context_sentence: params.sentence,
    repetition_count: 0,
    interval_days: 0,
    ease_factor: 2.5,
    status: "learning",
  };
}

export function cardsFromLesson(lesson: LessonPayload): SessionCard[] {
  return lesson.vocabulary.map((entry, index) => ({
    id: `vocab-${index}-${normalizeWord(entry.word)}`,
    front_phrase: entry.word,
    back_translation: entry.translation,
    context_sentence: entry.example_sentence,
    repetition_count: 0,
    interval_days: 0,
    ease_factor: 2.5,
    status: "learning",
  }));
}

export function sentencesOf(story: string): string[] {
  const parts = story
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  return parts.length > 0 ? parts.slice(0, 4) : [story.trim()];
}

export function sentenceAt(story: string, wordIndex: number): string {
  const sentences = story
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const all = sentences.length > 0 ? sentences : [story.trim()];
  let cursor = 0;
  for (const sentence of all) {
    const count = tokenize(sentence).length;
    if (wordIndex < cursor + count) {
      return sentence;
    }
    cursor += count;
  }
  return all[all.length - 1] ?? story.trim();
}

export function speechLocale(language: string): string {
  const locales: Record<string, string> = {
    en: "en-US",
    pt: "pt-BR",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    ja: "ja-JP",
    ru: "ru-RU",
  };
  return locales[language.trim().toLowerCase().slice(0, 2)] ?? language;
}

export const DEFAULT_TOPIC = "everyday life";

/**
 * Tema da lição do dia: o pedido na URL, senão o tema já aberto hoje,
 * senão um dos interesses do aluno (gira por dia), senão o tema padrão da API.
 */
export function chooseTopic(input: { param?: string | null; cached?: string | null; interests?: readonly string[] | null; date: string }): string {
  const asked = input.param?.trim();
  if (asked) {
    return asked.slice(0, 120);
  }
  const cached = input.cached?.trim();
  if (cached) {
    return cached;
  }
  const interests = (input.interests ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
  if (interests.length > 0) {
    const day = Number(input.date.replace(/\D/g, ""));
    return interests[(Number.isFinite(day) ? day : 0) % interests.length]!;
  }
  return DEFAULT_TOPIC;
}

/** Tempo mínimo de leitura antes de "lido até o fim" contar (≈240 palavras/min, nunca menos de 15 s). */
export function readingFloorSeconds(wordCount: number): number {
  return Math.max(15, Math.round(Math.max(0, wordCount) / 4));
}

/** Data ISO (AAAA-MM-DD) válida vinda da URL, ou o fallback. */
export function sessionDate(param: unknown, fallback: string): string {
  return typeof param === "string" && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : fallback;
}
