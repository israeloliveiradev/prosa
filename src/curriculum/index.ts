/**
 * Registro do currículo da trilha (M2): esqueleto + silabo + os 7 idiomas-alvo.
 *
 * Cada arquivo de idioma (`en.ts` … `ru.ts`) exporta `default` (LanguageCurriculum) e
 * `syllabus.ts` exporta `default` (Syllabus). Os imports são estáticos: o tsc confere os
 * tipos e a API não sobe com um arquivo faltando. `npx tsx src/curriculum/check.ts <arquivo>`
 * e test/curriculum.test.ts validam o conteúdo.
 */
import de from "./de.js";
import en from "./en.js";
import es from "./es.js";
import fr from "./fr.js";
import it from "./it.js";
import ja from "./ja.js";
import ru from "./ru.js";
import syllabus from "./syllabus.js";
import { pathBandFor, UNIT_IDS, UNITS, unitById, unitsOfBand } from "./units.js";
import {
  CURRICULUM_LANGS,
  PATH_BANDS,
  UI_LOCALES,
  type CurriculumLang,
  type LanguageCurriculum,
  type LanguageUnit,
  type PathBand,
  type Syllabus,
  type SyllabusEntry,
  type UiLocale,
  type UnitSkeleton,
} from "./types.js";

export * from "./types.js";
export { pathBandFor, UNIT_IDS, UNITS, unitById, unitsOfBand };

/** Todos os arquivos de conteúdo que o registro usa: os 7 idiomas-alvo e o silabo. */
export const CURRICULUM_FILES = [...CURRICULUM_LANGS, "syllabus"] as const;
export type CurriculumFile = (typeof CURRICULUM_FILES)[number];

export interface Curriculum {
  syllabus: Syllabus;
  languages: Record<CurriculumLang, LanguageCurriculum>;
}

export const CURRICULUM: Curriculum = {
  syllabus,
  languages: { en, es, de, fr, it, ja, ru },
};

/** Mantido assíncrono para quem chama não depender de como o conteúdo é carregado. */
export function getCurriculum(): Promise<Curriculum> {
  return Promise.resolve(CURRICULUM);
}

export function isCurriculumLang(value: string): value is CurriculumLang {
  return (CURRICULUM_LANGS as readonly string[]).includes(value);
}

export function isUiLocale(value: string): value is UiLocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}

export function isPathBand(value: string): value is PathBand {
  return (PATH_BANDS as readonly string[]).includes(value);
}

export function languageUnitOf(curriculum: Curriculum, lang: string, unitId: string): LanguageUnit | null {
  if (!isCurriculumLang(lang)) {
    return null;
  }
  return curriculum.languages[lang][unitId] ?? null;
}

export function syllabusEntryOf(curriculum: Curriculum, unitId: string): SyllabusEntry | null {
  return curriculum.syllabus[unitId] ?? null;
}

/** Título no idioma de interface pedido, com fallback para inglês e, sem entrada no silabo, para o tópico. */
export function unitTitle(entry: SyllabusEntry | null, unit: UnitSkeleton, locale: UiLocale): string {
  return entry?.title?.[locale]?.trim() || entry?.title?.en?.trim() || unit.topic;
}

/** Metas "eu consigo…" no idioma pedido, com fallback para inglês; vazio sem entrada no silabo. */
export function unitCanDo(entry: SyllabusEntry | null, locale: UiLocale): string[] {
  const goals = entry?.canDo?.[locale];
  if (Array.isArray(goals) && goals.length > 0) {
    return goals;
  }
  const english = entry?.canDo?.en;
  return Array.isArray(english) ? english : [];
}
