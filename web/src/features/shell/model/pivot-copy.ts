import type { DisplayLocale } from "@/lib/i18n";

const ORDER: readonly DisplayLocale[] = ["pt", "en", "de", "fr", "es", "it", "ja"];

/**
 * Monta a tabela por idioma a partir de uma tabela por chave: `{ chave: [pt, en, de, fr, es, it, ja] }`.
 * Mantém os 7 idiomas lado a lado, o que facilita a revisão da paridade.
 */
export function pivotCopy<K extends string>(rows: Record<K, readonly [string, string, string, string, string, string, string]>): Record<DisplayLocale, Record<K, string>> {
  const out = {} as Record<DisplayLocale, Record<K, string>>;
  ORDER.forEach((locale, index) => {
    const column = {} as Record<K, string>;
    for (const key of Object.keys(rows) as K[]) {
      column[key] = rows[key][index] as string;
    }
    out[locale] = column;
  });
  return out;
}
