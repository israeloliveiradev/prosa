export const HANDS_FREE_HOLD = 70;

export function handsFreeHeld(reference: string, spoken: string): boolean {
  const left = normalize(reference);
  const right = normalize(spoken);
  if (left.length === 0) {
    return right.length === 0;
  }
  if (right.length === 0) {
    return false;
  }
  const leftWords = left.split(" ");
  const rightWords = new Set(right.split(" "));
  const hits = leftWords.filter((word) => rightWords.has(word)).length;
  return Math.round((hits / leftWords.length) * 100) >= HANDS_FREE_HOLD;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
