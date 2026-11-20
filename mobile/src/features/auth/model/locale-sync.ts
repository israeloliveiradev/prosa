import type { DisplayLocale } from "@/lib/i18n";

/**
 * O servidor ainda guarda só "pt" e "en" em `display_locale` (cadastro e ajustes).
 * Estas regras evitam que a conta "desfaça" um idioma de interface que o
 * servidor não sabe representar (de, fr, es, it, ja).
 */
const SERVER_LOCALES: readonly string[] = ["pt", "en"];
const DISPLAY_LOCALES: readonly string[] = ["pt", "en", "de", "fr", "es", "it", "ja"];

/** Valor que o cadastro pode enviar: português fica; os outros idiomas mandam inglês. */
export function serverLocaleFor(locale: DisplayLocale): "pt" | "en" {
  return locale === "pt" ? "pt" : "en";
}

/**
 * Adota o idioma que a conta trouxe? Sim quando é um idioma de interface válido,
 * exceto quando o aparelho usa um idioma que o servidor não guarda e a conta só
 * trouxe o substituto (pt/en).
 */
export function shouldAdoptServerLocale(local: DisplayLocale, server: unknown): server is DisplayLocale {
  if (typeof server !== "string" || !DISPLAY_LOCALES.includes(server)) {
    return false;
  }
  if (server === local) {
    return false;
  }
  if (!SERVER_LOCALES.includes(local) && SERVER_LOCALES.includes(server)) {
    return false;
  }
  return true;
}
