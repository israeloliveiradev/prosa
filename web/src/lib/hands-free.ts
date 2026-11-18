export const HANDS_FREE_GAP_MS = 4_000;
export { HANDS_FREE_HOLD, handsFreeHeld } from "./hands-free-hold";

export type HandsFreeKind = "intro" | "hear" | "gap" | "confirm";

export interface HandsFreeStep {
  kind: HandsFreeKind;
  unit: number;
  sentence: number;
}

export function allSentences(story: string): string[] {
  const parts = story
    .split(/(?<=[.!?。！？])\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const sentences = parts.length > 0 ? parts : [story.trim()];
  return sentences.slice(0, 16);
}

export function handsFreeIntro(through: string, title: string): string {
  const code = through.trim().toLowerCase().slice(0, 2);
  const lines: Record<string, string> = {
    pt: `O tema é ${title}. Escute a frase, repita em voz alta e ouça a confirmação.`,
    en: `The topic is ${title}. Listen, repeat out loud, and hear the confirmation.`,
    es: `El tema es ${title}. Escucha, repite en voz alta y oye la confirmación.`,
    de: `Das Thema ist ${title}. Hör zu, sprich laut nach und hör die Bestätigung.`,
    fr: `Le thème est ${title}. Écoute, répète à voix haute, puis écoute la confirmation.`,
    it: `Il tema è ${title}. Ascolta, ripeti ad alta voce e senti la conferma.`,
    ru: `Тема: ${title}. Слушай, повтори вслух и услышь подтверждение.`,
    ja: `テーマは${title}です。聞いて、声に出して繰り返して、確認を聞いてください。`,
  };
  return lines[code] ?? lines.en ?? title;
}

export function handsFreeSteps(sentenceCount: number): HandsFreeStep[] {
  const count = Math.max(0, Math.min(16, sentenceCount));
  const steps: HandsFreeStep[] = [{ kind: "intro", unit: 0, sentence: -1 }];
  for (let sentence = 0; sentence < count; sentence += 1) {
    const unit = sentence + 1;
    steps.push({ kind: "hear", unit, sentence });
    steps.push({ kind: "gap", unit, sentence });
    steps.push({ kind: "confirm", unit, sentence });
  }
  return steps;
}

export function sentenceRanges(story: string): Array<{ text: string; start: number; end: number }> {
  const sentences = allSentences(story);
  let cursor = 0;
  return sentences.map((text) => {
    const count = text.split(/\s+/).filter((token) => token.length > 0).length;
    const start = cursor;
    cursor += count;
    return { text, start, end: start + count };
  });
}

