export interface ChunkEntry {
  word: string;
  translation: string;
}

export function chunksInSentence(vocabulary: ChunkEntry[], sentence: string): ChunkEntry[] {
  const words = tokens(sentence);
  const seen = new Set<string>();
  const found: ChunkEntry[] = [];
  for (const entry of vocabulary) {
    const parts = tokens(entry.word);
    if (parts.length < 2 || parts.length > 4 || !entry.translation.trim()) {
      continue;
    }
    const key = parts.join(" ");
    if (seen.has(key) || !contains(words, parts)) {
      continue;
    }
    seen.add(key);
    found.push({ word: parts.join(" "), translation: entry.translation.trim() });
  }
  return found;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}

function contains(words: string[], parts: string[]): boolean {
  for (let start = 0; start <= words.length - parts.length; start += 1) {
    if (parts.every((part, offset) => words[start + offset] === part)) {
      return true;
    }
  }
  return false;
}
