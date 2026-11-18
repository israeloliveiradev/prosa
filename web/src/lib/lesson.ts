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
  };
  return locales[language] ?? language;
}
