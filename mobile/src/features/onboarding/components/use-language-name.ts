import { useCallback } from "react";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { displayLanguageName } from "../model/language-name";

/** Nome do idioma no idioma da interface (Intl.DisplayNames). */
export function useLanguageName(): (code: string) => string {
  const locale = useLocale();
  return useCallback((code: string) => displayLanguageName(code, LOCALE_BCP47[locale], languageName), [locale]);
}
