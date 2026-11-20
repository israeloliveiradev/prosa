/**
 * Currículo da trilha híbrida (M2).
 *
 * - O ESQUELETO (units.ts) é o mesmo para todos os idiomas: 32 unidades funcionais CEFR
 *   (A1 8, A2 8, B1 8, B2 5, C1 3), com tópico funcional e foco de habilidade.
 * - O SILABO (syllabus.ts) dá a cada unidade título e metas "eu consigo…" nos 7 idiomas
 *   de interface.
 * - Cada IDIOMA-ALVO (en.ts, es.ts, …) dá, por unidade, o foco gramatical e os lemas-núcleo.
 * - O CONTEÚDO (lição, notícia, cena) é gerado pela IA a partir disso + temas do aluno.
 */

export const UI_LOCALES = ["pt", "en", "de", "fr", "es", "it", "ja"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const CURRICULUM_LANGS = ["en", "es", "de", "fr", "it", "ja", "ru"] as const;
export type CurriculumLang = (typeof CURRICULUM_LANGS)[number];

export const PATH_BANDS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type PathBand = (typeof PATH_BANDS)[number];

export type SkillFocus = "listening" | "reading" | "speaking" | "writing";

/** Id estável da unidade: "a1-01" … "c1-03". */
export type UnitId = string;

export interface UnitSkeleton {
  id: UnitId;
  band: PathBand;
  /** Posição global na trilha, 1..32. */
  order: number;
  /** Tópico funcional, em inglês, para o prompt da IA. */
  topic: string;
  /** Habilidades que a unidade puxa mais. */
  focus: SkillFocus[];
}

export interface SyllabusEntry {
  /** Título curto (2–5 palavras) por idioma de interface. */
  title: Record<UiLocale, string>;
  /** 2 ou 3 metas "eu consigo…" por idioma de interface, mesma quantidade em todos. */
  canDo: Record<UiLocale, string[]>;
}

export type Syllabus = Record<UnitId, SyllabusEntry>;

export interface GrammarFocus {
  /** Nome do ponto gramatical NO IDIOMA-ALVO (ex.: "Present Simple", "Passé composé", "て形"). */
  name: string;
  /** 1–2 frases em INGLÊS dizendo o que a unidade pratica (vai para o prompt da IA). */
  summary: string;
  /** 2 frases-exemplo curtas NO IDIOMA-ALVO, no nível da unidade. */
  examples: string[];
}

export interface CoreLemma {
  /** Forma de dicionário no idioma-alvo (ja: kanji/kana como no dicionário). */
  lemma: string;
  /** Leitura em kana (só ja) ou com acento tônico marcado (só ru, opcional). */
  reading?: string;
  /** Glosa curta em inglês. */
  gloss: string;
}

export interface LanguageUnit {
  grammar: GrammarFocus;
  /** 10 a 15 lemas-núcleo de alta frequência, úteis para o tópico da unidade. */
  lemmas: CoreLemma[];
}

export type LanguageCurriculum = Record<UnitId, LanguageUnit>;
