/**
 * Lógica pura das práticas: números do hub, frases para pronúncia e oficina,
 * filtros da Revisão. Sem React: o teste unitário roda em Node.
 */
import type { PathResponse } from "@/api/schemas/path";
import { dueCards, isDue } from "@/lib/fsrs";
import type { SessionCard } from "@/lib/types";

export type PracticeId = "memory" | "pronunciation" | "workshop" | "duel";

export interface PracticeStats {
  /** Cartões para revisar agora; null quando o aluno ainda não tem cartões. */
  due: number | null;
  /** Melhor pontuação do Duelo; null quando nunca jogou ou não foi carregada. */
  duelBest: number | null;
}

export function hubStats(cards: readonly SessionCard[], duelBest: number | null, now = Date.now()): PracticeStats {
  return {
    due: cards.length === 0 ? null : cards.filter((card) => isDue(card, now)).length,
    duelBest: duelBest !== null && duelBest > 0 ? duelBest : null,
  };
}

export type MemoryFilter = "due" | "learning" | "mastered";

export function filterCards(cards: readonly SessionCard[], filter: MemoryFilter, now = Date.now()): SessionCard[] {
  if (filter === "due") {
    return dueCards(cards.filter((card) => card.status !== "mastered"), now);
  }
  if (filter === "mastered") {
    return cards.filter((card) => card.status === "mastered");
  }
  return cards.filter((card) => card.status !== "mastered");
}

export function filterCounts(cards: readonly SessionCard[], now = Date.now()): Record<MemoryFilter, number> {
  return {
    due: filterCards(cards, "due", now).length,
    learning: filterCards(cards, "learning", now).length,
    mastered: filterCards(cards, "mastered", now).length,
  };
}

const SENTENCE_MIN = 12;
const SENTENCE_MAX = 140;

/** Divide um texto em frases curtas o bastante para repetir em voz alta. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= SENTENCE_MIN && part.length <= SENTENCE_MAX);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export interface LessonLike {
  story_text: string;
  vocabulary?: Array<{ example_sentence?: string }>;
}

/**
 * Frases para treinar: primeiro as das lições recentes (mais nova primeiro, história e exemplos
 * do vocabulário), senão os exemplos da gramática da unidade atual. Nunca inventa frases.
 */
export function pickSentences(
  lessons: ReadonlyArray<{ lesson: LessonLike }>,
  path: Pick<PathResponse, "current_unit_id" | "units"> | null | undefined,
  limit = 6,
): { sentences: string[]; origin: "lessons" | "unit" | "none" } {
  const fromLessons = unique(
    lessons.flatMap(({ lesson }) => [
      ...splitSentences(lesson.story_text),
      ...(lesson.vocabulary ?? []).flatMap((entry) => (entry.example_sentence ? splitSentences(entry.example_sentence) : [])),
    ]),
  ).slice(0, limit);
  if (fromLessons.length > 0) {
    return { sentences: fromLessons, origin: "lessons" };
  }
  const unit = path?.units.find((item) => item.id === path.current_unit_id);
  const examples = unique((unit?.grammar?.examples ?? []).map((item) => item.trim()).filter((item) => item.length >= 3)).slice(0, limit);
  return examples.length > 0 ? { sentences: examples, origin: "unit" } : { sentences: [], origin: "none" };
}

/** Frase digitada na oficina: aparada e com limite do servidor (até 240 caracteres). */
export function cleanTypedSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}
