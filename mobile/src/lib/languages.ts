import { useCallback } from "react";
import { getLocale, LOCALE_BCP47, useLocale, type DisplayLocale } from "@/lib/i18n";

/**
 * Idiomas que a Prosa ensina. `name` é o endônimo (o nome no próprio idioma);
 * para o rótulo no idioma da interface use `languageName(id)`.
 */
export const STUDY_LANGUAGES = [
  { id: "en", name: "English" },
  { id: "es", name: "Español" },
  { id: "de", name: "Deutsch" },
  { id: "ru", name: "Русский" },
  { id: "fr", name: "Français" },
  { id: "it", name: "Italiano" },
  { id: "ja", name: "日本語" },
] as const;

/** Idiomas de apoio ("através de"): português e qualquer idioma ensinado. Português nunca é alvo. */
export const THROUGH_LANGUAGES = [{ id: "pt", name: "Português" }, ...STUDY_LANGUAGES] as const;
export const SUPPORT_LANGUAGES = THROUGH_LANGUAGES;

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

/**
 * Nomes de reserva (CLDR, como o Intl.DisplayNames devolve), para motores sem
 * Intl.DisplayNames (Hermes antigo). Forma de início de rótulo: primeira letra maiúscula.
 */
const FALLBACK_NAMES: Record<DisplayLocale, Record<ThroughLang, string>> = {
  pt: { pt: "Português", en: "Inglês", es: "Espanhol", de: "Alemão", ru: "Russo", fr: "Francês", it: "Italiano", ja: "Japonês" },
  en: { pt: "Portuguese", en: "English", es: "Spanish", de: "German", ru: "Russian", fr: "French", it: "Italian", ja: "Japanese" },
  de: {
    pt: "Portugiesisch",
    en: "Englisch",
    es: "Spanisch",
    de: "Deutsch",
    ru: "Russisch",
    fr: "Französisch",
    it: "Italienisch",
    ja: "Japanisch",
  },
  fr: { pt: "Portugais", en: "Anglais", es: "Espagnol", de: "Allemand", ru: "Russe", fr: "Français", it: "Italien", ja: "Japonais" },
  es: { pt: "Portugués", en: "Inglés", es: "Español", de: "Alemán", ru: "Ruso", fr: "Francés", it: "Italiano", ja: "Japonés" },
  it: {
    pt: "Portoghese",
    en: "Inglese",
    es: "Spagnolo",
    de: "Tedesco",
    ru: "Russo",
    fr: "Francese",
    it: "Italiano",
    ja: "Giapponese",
  },
  ja: { pt: "ポルトガル語", en: "英語", es: "スペイン語", de: "ドイツ語", ru: "ロシア語", fr: "フランス語", it: "イタリア語", ja: "日本語" },
};

const ENDONYMS: Record<ThroughLang, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
  de: "Deutsch",
  ru: "Русский",
  fr: "Français",
  it: "Italiano",
  ja: "日本語",
};

/** Idiomas de interface que escrevem nomes de idioma em minúscula no meio da frase. */
const LOWERCASE_INLINE: ReadonlySet<DisplayLocale> = new Set(["pt", "fr", "es", "it"]);

const displayNamesCache = new Map<string, Intl.DisplayNames | null>();

function displayNamesFor(bcp47: string): Intl.DisplayNames | null {
  if (displayNamesCache.has(bcp47)) {
    return displayNamesCache.get(bcp47) ?? null;
  }
  let names: Intl.DisplayNames | null = null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      names = new Intl.DisplayNames([bcp47], { type: "language", fallback: "none" });
    }
  } catch {
    names = null;
  }
  displayNamesCache.set(bcp47, names);
  return names;
}

function intlName(code: string, bcp47: string): string | null {
  try {
    const name = displayNamesFor(bcp47)?.of(code);
    return name && name.toLowerCase() !== code.toLowerCase() ? name : null;
  } catch {
    return null;
  }
}

function capitalize(text: string, bcp47: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(bcp47) + text.slice(1) : text;
}

function fallbackName(code: string, locale: DisplayLocale): string | null {
  const table = FALLBACK_NAMES[locale] ?? FALLBACK_NAMES.en;
  return (table as Record<string, string>)[code] ?? null;
}

/**
 * Nome do idioma `code` no idioma de interface, como rótulo (primeira letra maiúscula):
 * "Inglês", "Englisch", "Anglais", "英語". Usa Intl.DisplayNames e cai na tabela fixa.
 */
export function languageName(code: string, locale: DisplayLocale = getLocale()): string {
  const bcp47 = LOCALE_BCP47[locale] ?? "en";
  const name = intlName(code, bcp47) ?? fallbackName(code, locale);
  return name ? capitalize(name, bcp47) : code;
}

/** Nome do idioma para o meio de uma frase: "inglês" em pt/fr/es/it, "Englisch" em de. */
export function languageNameInline(code: string, locale: DisplayLocale = getLocale()): string {
  const label = languageName(code, locale);
  return LOWERCASE_INLINE.has(locale) ? label.toLocaleLowerCase(LOCALE_BCP47[locale]) : label;
}

/** Nome do idioma nele mesmo ("Deutsch", "Français", "日本語"), para seletores de idioma. */
export function endonym(code: string): string {
  const fixed = (ENDONYMS as Record<string, string>)[code];
  const name = intlName(code, code) ?? fixed;
  return name ? capitalize(name, code) : code;
}

/** `languageName` reativo ao idioma de interface. */
export function useLanguageName(): (code: string) => string {
  const locale = useLocale();
  return useCallback((code: string) => languageName(code, locale), [locale]);
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

/** Artigo definido francês para nomes de idioma (todos masculinos): "l’anglais", "le portugais". */
function frenchArticle(name: string): string {
  return /^[aeiouyhâàéèêîïôû]/i.test(name) ? "l’" : "le ";
}

/** Artigo definido italiano para nomes de idioma (todos masculinos): "l’inglese", "lo spagnolo", "il tedesco". */
function italianArticle(name: string): string {
  if (/^[aeiouàèéìòù]/i.test(name)) {
    return "l’";
  }
  if (/^(s[^aeiou]|z|gn|ps|x|y)/i.test(name)) {
    return "lo ";
  }
  return "il ";
}

/** "Alemão através do inglês", "German through English", "英語で学ぶドイツ語"… */
export function trackLabel(track: { target_lang: string; through_lang: string }, locale: DisplayLocale = getLocale()): string {
  const study = languageName(track.target_lang, locale);
  const through = languageNameInline(track.through_lang, locale);
  switch (locale) {
    case "pt":
      return `${study} através do ${through}`;
    case "de":
      return `${study} über ${through}`;
    case "fr":
      return `${study} à travers ${frenchArticle(through)}${through}`;
    case "es":
      return `${study} a través del ${through}`;
    case "it":
      return `${study} attraverso ${italianArticle(through)}${through}`;
    case "ja":
      return `${through}で学ぶ${study}`;
    default:
      return `${study} through ${through}`;
  }
}
