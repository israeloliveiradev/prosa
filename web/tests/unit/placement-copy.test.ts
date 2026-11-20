import { test, expect } from "@playwright/test";
import { PLACEMENT_COPY } from "@/lib/copy/placement";
import { DISPLAY_LOCALES } from "@/lib/i18n";

function placeholders(text: string): string[] {
  return Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1] ?? "").sort();
}

test.describe("placement: textos nos 7 idiomas de interface", () => {
  test("todos os idiomas têm as mesmas chaves, sem texto vazio", () => {
    const reference = Object.keys(PLACEMENT_COPY.pt).sort();
    for (const locale of DISPLAY_LOCALES) {
      const table = PLACEMENT_COPY[locale] as Record<string, string>;
      expect(Object.keys(table).sort(), locale).toEqual(reference);
      for (const key of reference) {
        expect(table[key]?.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  test("os marcadores ({n}, {date}…) são os mesmos em todos os idiomas", () => {
    for (const key of Object.keys(PLACEMENT_COPY.pt)) {
      const expected = placeholders((PLACEMENT_COPY.pt as Record<string, string>)[key] ?? "");
      for (const locale of DISPLAY_LOCALES) {
        const text = (PLACEMENT_COPY[locale] as Record<string, string>)[key] ?? "";
        expect(placeholders(text), `${locale}.${key}`).toEqual(expected);
      }
    }
  });

  test("idiomas além de pt/en têm tradução própria (não cópia do inglês)", () => {
    for (const locale of ["de", "fr", "es", "it", "ja"] as const) {
      expect(PLACEMENT_COPY[locale].start).not.toBe(PLACEMENT_COPY.en.start);
      expect(PLACEMENT_COPY[locale].dek).not.toBe(PLACEMENT_COPY.en.dek);
    }
  });
});
