export interface DictationPiece {
  kind: "word" | "gap";
  text: string;
  gap?: number;
}

export interface DictationGap {
  id: number;
  expected: string;
}

const GAP_LIMIT = 12;

export function buildDictation(story: string, vocabulary: Array<{ word: string }>): { pieces: DictationPiece[]; gaps: DictationGap[] } {
  const words = surfaceTokens(story);
  const phrases = vocabulary
    .map((entry) => tokens(entry.word))
    .filter((parts) => parts.length >= 1 && parts.length <= 4)
    .sort((left, right) => right.length - left.length);
  const candidates: Array<{ start: number; end: number; expected: string }> = [];
  for (let index = 0; index < words.length; index += 1) {
    const phrase = phrases.find((parts) => fits(words, index, parts));
    if (!phrase || !words[index]?.norm) {
      continue;
    }
    candidates.push({
      start: index,
      end: index + phrase.length - 1,
      expected: phrase.join(" "),
    });
    index += phrase.length - 1;
  }
  const chosen = takeSpread(candidates, GAP_LIMIT);
  const byStart = new Map(chosen.map((span, id) => [span.start, { ...span, id }]));
  const pieces: DictationPiece[] = [];
  const gaps: DictationGap[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const span = byStart.get(index);
    const word = words[index];
    if (!word) {
      continue;
    }
    if (!span) {
      pieces.push({ kind: "word", text: word.surface });
      continue;
    }
    if (word.lead) {
      pieces.push({ kind: "word", text: word.lead });
    }
    pieces.push({ kind: "gap", text: span.expected, gap: span.id });
    gaps.push({ id: span.id, expected: span.expected });
    const tail = words[span.end]?.tail ?? "";
    if (tail) {
      pieces.push({ kind: "word", text: tail });
    }
    index = span.end;
  }
  return { pieces, gaps };
}

export function dictationMatches(answer: string, expected: string): boolean {
  const heard = tokens(answer);
  const wanted = tokens(expected);
  return heard.length > 0 && heard.length === wanted.length && heard.every((token, index) => token === wanted[index]);
}

function fits(words: Array<{ norm: string }>, start: number, parts: string[]): boolean {
  if (start + parts.length > words.length) {
    return false;
  }
  return parts.every((part, offset) => words[start + offset]?.norm === part);
}

function takeSpread<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) {
    return items;
  }
  const indexes = new Set<number>();
  for (let step = 0; step < limit; step += 1) {
    indexes.add(Math.round((step * (items.length - 1)) / (limit - 1)));
  }
  for (let index = 0; index < items.length && indexes.size < limit; index += 1) {
    indexes.add(index);
  }
  return [...indexes]
    .sort((left, right) => left - right)
    .map((index) => items[index]!);
}

function surfaceTokens(story: string): Array<{ surface: string; norm: string; lead: string; core: string; tail: string }> {
  return story
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((surface) => {
      const match = surface.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}'’.-]*[\p{L}\p{N}]|[\p{L}\p{N}])([^\p{L}\p{N}]*)$/u);
      const core = match?.[2] ?? "";
      return {
        surface,
        norm: core.toLowerCase(),
        lead: match?.[1] ?? "",
        core,
        tail: match?.[3] ?? (core ? "" : surface),
      };
    });
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}
