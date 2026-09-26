import type { Pool } from "pg";

export interface CognateAnchor {
  word: string;
  familiar: string;
  gloss: string;
  kind: "true" | "false";
}

const VERBS: Record<string, string> = {
  en: "be, have, go, can",
  es: "ser, estar, tener, ir, poder",
  de: "sein, haben, gehen, können",
  fr: "être, avoir, aller, pouvoir",
  it: "essere, avere, andare, potere",
  ru: "быть, иметь, идти, мочь",
  ja: "です, いる, いく, できる",
  pt: "ser, estar, ter, ir, poder",
};

export function cognateLessonOpen(level: string, used: number): boolean {
  return level === "A1" && used < 5;
}

export function frequentVerbs(targetLang: string): string {
  return VERBS[targetLang.toLowerCase()] ?? "be, have, go, can";
}

export async function listCognates(pool: Pool, throughLang: string, targetLang: string): Promise<CognateAnchor[]> {
  const result = await pool.query<{ target_word: string; through_word: string; gloss: string; kind: "true" | "false" }>(
    `SELECT target_word, through_word, gloss, kind
     FROM cognate_pairs
     WHERE through_lang = $1 AND target_lang = $2
     ORDER BY kind, target_word`,
    [throughLang.toLowerCase(), targetLang.toLowerCase()],
  );
  return result.rows.map((row) => ({
    word: row.target_word,
    familiar: row.through_word,
    gloss: row.gloss,
    kind: row.kind,
  }));
}
