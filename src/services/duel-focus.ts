import type { CoreLemma } from "../curriculum/types.js";
import { weakestSkill, type LearnerProfile } from "./learner-profile.js";
import { lemmaInText } from "./path-service.js";

const KIND_HINT: Record<string, string> = {
  tense: "verb tense",
  agreement: "agreement",
  article: "articles",
  preposition: "prepositions",
  literal: "literal translation",
  calque: "calques from the through language",
  grammar: "grammar",
  reading: "reading vocabulary",
  listening: "listening vocabulary",
  vocabulary: "high-frequency vocabulary",
  pronunciation: "words that look alike",
  fluency: "connectors",
  writing: "connectors and subordination",
};

export function duelFocus(profile: LearnerProfile): string[] {
  const kinds = profile.error_kinds.map((item) => item.trim()).filter(Boolean);
  if (kinds.length > 0) {
    return kinds.slice(0, 3).map((kind) => KIND_HINT[kind.toLowerCase()] ?? kind);
  }
  const weak = weakestSkill(profile);
  if (weak && KIND_HINT[weak]) {
    return [KIND_HINT[weak]];
  }
  return [];
}

/** Quantos lemas da unidade vão para o prompt da rodada-chefe. */
export const UNIT_DUEL_WORDS = 10;

export interface UnitDuelPlan {
  topic: string;
  grammar: string | null;
  /** Lemas-núcleo da unidade: primeiro os que o aluno ainda não fixou, depois os outros. */
  words: string[];
}

/**
 * O que a rodada-chefe cobra: a gramática da unidade e os lemas-núcleo, com os lemas que
 * ainda não estão firmes (`focus`) na frente.
 */
export function unitDuelPlan(input: {
  topic: string;
  grammar: { name: string; summary: string } | null;
  lemmas: readonly CoreLemma[];
  focus: readonly CoreLemma[];
}): UnitDuelPlan {
  const ordered = [...input.focus, ...input.lemmas];
  const words: string[] = [];
  for (const item of ordered) {
    const word = item.lemma.trim();
    if (word && !words.includes(word)) {
      words.push(word);
    }
    if (words.length >= UNIT_DUEL_WORDS) {
      break;
    }
  }
  return {
    topic: input.topic,
    grammar: input.grammar ? `${input.grammar.name}: ${input.grammar.summary}` : null,
    words,
  };
}

/** O drill usa algum lema da unidade (na frase ou na resposta certa)? */
export function drillHitsUnit(
  drill: { prompt: string; options: readonly string[]; answer: number },
  words: readonly string[],
  lang: string,
): boolean {
  const text = `${drill.prompt.replace(/_{3,}/g, ` ${drill.options[drill.answer] ?? ""} `)}`;
  return words.some((word) => lemmaInText(text, word, lang));
}

/** Rodada-chefe: os drills que usam lemas da unidade vêm primeiro (ordem estável), até `max`. */
export function rankUnitDrills<T extends { prompt: string; options: readonly string[]; answer: number }>(
  drills: readonly T[],
  words: readonly string[],
  lang: string,
  max = 12,
): T[] {
  const hits = drills.filter((drill) => drillHitsUnit(drill, words, lang));
  const rest = drills.filter((drill) => !drillHitsUnit(drill, words, lang));
  return [...hits, ...rest].slice(0, max);
}
