const LABELS: Record<string, string> = {
  pt: "Brazilian Portuguese",
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  it: "Italian",
  ru: "Russian",
  ja: "Japanese",
};

export function throughLabel(code: string): string {
  return LABELS[code] ?? code;
}

export function namedLang(code: string): string {
  return `${throughLabel(code)} (${code})`;
}

export function spanishGlossLeak(text: string): boolean {
  return /ñ|¿|¡|cción\b|ción\b|sión\b|ía\b/iu.test(text.normalize("NFC"));
}

export function lessonLeaksSpanish(lesson: { translation: string; vocabulary: Array<{ translation: string }> }): boolean {
  if (spanishGlossLeak(lesson.translation)) {
    return true;
  }
  return lesson.vocabulary.some((item) => spanishGlossLeak(item.translation));
}
