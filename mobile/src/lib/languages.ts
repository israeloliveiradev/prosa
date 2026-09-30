import { getLocale } from "@/lib/i18n";

export const STUDY_LANGUAGES = [
  { id: "en", name: "Inglês" },
  { id: "es", name: "Espanhol" },
  { id: "de", name: "Alemão" },
  { id: "ru", name: "Russo" },
  { id: "fr", name: "Francês" },
  { id: "it", name: "Italiano" },
  { id: "ja", name: "Japonês" },
] as const;

export const THROUGH_LANGUAGES = [{ id: "pt", name: "Português" }, ...STUDY_LANGUAGES] as const;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type StudyLang = (typeof STUDY_LANGUAGES)[number]["id"];
export type ThroughLang = (typeof THROUGH_LANGUAGES)[number]["id"];
export type CourseLevel = (typeof CEFR_LEVELS)[number];

export interface StudyTrack {
  target_lang: StudyLang;
  through_lang: ThroughLang;
  level?: CourseLevel;
  active: boolean;
}

const NAMES = {
  pt: {
    pt: "Português",
    en: "Inglês",
    es: "Espanhol",
    de: "Alemão",
    ru: "Russo",
    fr: "Francês",
    it: "Italiano",
    ja: "Japonês",
  },
  en: {
    pt: "Portuguese",
    en: "English",
    es: "Spanish",
    de: "German",
    ru: "Russian",
    fr: "French",
    it: "Italian",
    ja: "Japanese",
  },
} as const;

export function languageName(code: string): string {
  const locale = getLocale();
  return NAMES[locale][code as keyof (typeof NAMES)["pt"]] ?? NAMES.pt[code as keyof (typeof NAMES)["pt"]] ?? code;
}

export function isStudyLang(value: string): value is StudyLang {
  return STUDY_LANGUAGES.some((item) => item.id === value);
}

export function isThroughLang(value: string): value is ThroughLang {
  return THROUGH_LANGUAGES.some((item) => item.id === value);
}

export function isCourseLevel(value: string): value is CourseLevel {
  return CEFR_LEVELS.some((item) => item === value);
}

export function throughForTarget(target: string, currentThrough: string): string {
  if (target !== currentThrough) {
    return currentThrough;
  }
  return target === "en" ? "pt" : "en";
}

export function trackLabel(track: { target_lang: string; through_lang: string }, locale: "pt" | "en" = getLocale()): string {
  const study = languageName(track.target_lang);
  const through = languageName(track.through_lang);
  return locale === "en" ? `${study} through ${through}` : `${study} através do ${through.toLowerCase()}`;
}
