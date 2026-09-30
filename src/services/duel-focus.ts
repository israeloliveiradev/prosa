import { weakestSkill, type LearnerProfile } from "./learner-profile.js";

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
