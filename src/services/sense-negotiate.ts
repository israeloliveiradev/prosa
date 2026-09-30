export const MOVES = ["clarify", "rephrase", "continue"] as const;

export type TalkMove = (typeof MOVES)[number];

const PRAISE = /\b(great|good job|well done|nice work|excellent|perfect|amazing|awesome|bravo|muito bem|parabéns|ótimo|excelente|perfecto|muy bien|très bien|bravo|gut gemacht|bravissimo|молодец|よくでき)\b/iu;

export function talkMove(line: string, history: Array<{ role: string; text: string }>): TalkMove {
  const spoken = line.trim();
  if (!spoken) {
    return "continue";
  }
  if (thin(spoken) || dangling(spoken) || pronounOnly(spoken, history)) {
    return "clarify";
  }
  if (history.some((turn) => turn.role === "mind" && askingClarify(turn.text))) {
    return "rephrase";
  }
  return "continue";
}

export function stripPraise(reply: string): string {
  return reply
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !PRAISE.test(sentence))
    .join(" ")
    .trim();
}

export function askingClarify(reply: string): boolean {
  return /[?？]/.test(reply) && /\b(mean|meant|which|who|what|quando|quem|qual|o que|cómo|qué|comment|quoi|was|wer|che|cosa|что|どれ|なに)\b/iu.test(reply);
}

function thin(line: string): boolean {
  const words = line
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length > 0 && words.length <= 2;
}

function dangling(line: string): boolean {
  return /^(it|this|that|they|he|she|isso|isto|aquilo|ele|ela|eles|esto|eso|él|elle|ça|das|er|sie|questo|quello|это|それ|あれ)\b/iu.test(line.trim()) && !/\b(because|porque|pues|weil|parce|perché|потому|から)\b/iu.test(line);
}

function pronounOnly(line: string, history: Array<{ role: string; text: string }>): boolean {
  if (history.filter((turn) => turn.role === "learner").length === 0) {
    return false;
  }
  return /^(he|she|they|it|this|that|ele|ela|eles|isso|esto|eso|il|elle|er|sie|lui|это|それ)\.?$/iu.test(line.trim());
}
