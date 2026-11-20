import { useLocale, type DisplayLocale } from "@/lib/i18n";

/**
 * Textos de uma área da interface nos 7 idiomas de interface.
 *
 * Cada área nova (sessão, trilha, onboarding, shell…) declara a sua tabela em
 * `src/lib/copy/<area>.ts` com TODOS os idiomas, e a tela lê com `useAreaCopy`.
 * O teste `tests/unit/i18n-parity.test.ts` exige as mesmas chaves em todos eles,
 * nenhum texto vazio e os mesmos {placeholders}.
 */
export type AreaTable<T extends object> = Record<DisplayLocale, T>;

/** Marca não enumerável que identifica uma tabela criada por `defineArea`. */
const AREA_TABLE = Symbol.for("prosa.copy.area");

export function defineArea<T extends object>(table: AreaTable<T>): AreaTable<T> {
  if (!Object.prototype.hasOwnProperty.call(table, AREA_TABLE)) {
    Object.defineProperty(table, AREA_TABLE, { value: true, enumerable: false });
  }
  return table;
}

/** Verdadeiro para tabelas criadas com `defineArea` (usado pelo teste de paridade). */
export function isAreaTable(value: unknown): value is AreaTable<Record<string, unknown>> {
  return typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(value, AREA_TABLE);
}

export function areaCopy<T extends object>(table: AreaTable<T>, locale: DisplayLocale): T {
  return table[locale] ?? table.en ?? table.pt;
}

export function useAreaCopy<T extends object>(table: AreaTable<T>): T {
  return areaCopy(table, useLocale());
}
