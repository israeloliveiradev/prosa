import type { CefrLevel } from "../types/database.js";

export const SCORE_CAP = 16;
export const SCORE_MIN_MS = 4_000;

export interface ScoreSections {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}

export function thetaToScore(theta: number): number {
  return Math.max(0, Math.min(100, Math.round(((theta + 3.2) / 6.4) * 100)));
}

export function bandFromScore(score: number): CefrLevel {
  if (score < 20) return "A1";
  if (score < 40) return "A2";
  if (score < 55) return "B1";
  if (score < 75) return "B2";
  if (score < 90) return "C1";
  return "C2";
}

export function combineScore(mc: number, writing: number, speaking: number): number {
  return Math.max(0, Math.min(100, Math.round(mc * 0.6 + writing * 0.2 + speaking * 0.2)));
}

export function rushedFlags(timings: Record<string, number>, minMs = SCORE_MIN_MS): string[] {
  const values = Object.values(timings).filter((ms) => Number.isFinite(ms) && ms >= 0);
  if (values.length === 0) {
    return [];
  }
  const rushed = values.filter((ms) => ms < minMs).length;
  if (rushed >= Math.max(3, Math.ceil(values.length / 2))) {
    return ["rushed"];
  }
  return [];
}

export function certificateHeld(flags: string[]): boolean {
  return flags.includes("rushed");
}

export function scorePrompts(lang: string): { writing: string; speaking: string } {
  const prompt = PROMPTS[lang.trim().toLowerCase()];
  if (prompt) {
    return prompt;
  }
  return {
    writing: "Write about a change at work or school. Say who gained, who lost, and give one example.",
    speaking: "Describe a problem you solved recently. Say what you did and why it worked.",
  };
}

const PROMPTS: Record<string, { writing: string; speaking: string }> = {
  en: {
    writing: "Write about a change at work or school. Say who gained, who lost, and give one example.",
    speaking: "Describe a problem you solved recently. Say what you did and why it worked.",
  },
  es: {
    writing: "Escribe sobre un cambio en el trabajo o en la escuela. Di quién ganó, quién perdió y pon un ejemplo.",
    speaking: "Describe un problema que resolviste hace poco. Di qué hiciste y por qué funcionó.",
  },
  de: {
    writing: "Schreibe über eine Änderung in der Arbeit oder in der Schule. Sag, wer profitiert hat, wer verloren hat, und nenne ein Beispiel.",
    speaking: "Beschreibe ein Problem, das du kürzlich gelöst hast. Sag, was du getan hast und warum es geklappt hat.",
  },
  fr: {
    writing: "Écris sur un changement au travail ou à l'école. Dis qui y gagne, qui y perd, et donne un exemple.",
    speaking: "Décris un problème que tu as résolu récemment. Dis ce que tu as fait et pourquoi ça a marché.",
  },
  it: {
    writing: "Scrivi di un cambiamento al lavoro o a scuola. Di chi ci ha guadagnato, chi ci ha perso, e fai un esempio.",
    speaking: "Descrivi un problema che hai risolto di recente. Di che cosa hai fatto e perché ha funzionato.",
  },
  ru: {
    writing: "Напишите об изменении на работе или в школе. Кто выиграл, кто проиграл, и приведите пример.",
    speaking: "Расскажите о проблеме, которую вы недавно решили. Что вы сделали и почему это сработало.",
  },
  ja: {
    writing: "仕事や学校での変化について書いてください。得をした人、損をした人、例を一つ入れてください。",
    speaking: "最近解決した問題を話してください。何をしたか、なぜうまくいったかを言ってください。",
  },
};
