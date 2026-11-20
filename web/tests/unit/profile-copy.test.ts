import { test, expect } from "@playwright/test";
import { CEFR_BANDS, canDoFor } from "@/lib/can-do";
import { PROFILE, accountLocale, listeningBand, mindLine, mindName, orderTracks, streakText } from "@/lib/copy/profile";
import { MINDS } from "@/design/minds";
import { DISPLAY_LOCALES } from "@/lib/i18n";

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test.describe("Você: regras puras", () => {
  test("só pt e en vão para a conta (o backend aceita só esses até o M2)", () => {
    expect(accountLocale("pt")).toBe("pt");
    expect(accountLocale("en")).toBe("en");
    for (const locale of ["de", "fr", "es", "it", "ja"] as const) {
      expect(accountLocale(locale)).toBeNull();
    }
  });

  test("faixa estimada da escuta segue a régua do servidor e some sem medida", () => {
    expect(listeningBand(0)).toBe("");
    expect(listeningBand(10)).toBe("A1");
    expect(listeningBand(40)).toBe("A2");
    expect(listeningBand(55)).toBe("B1");
    expect(listeningBand(90)).toBe("B2");
  });

  test("cursos: o ativo primeiro, sem idioma repetido", () => {
    const tracks = [
      { target_lang: "es", through_lang: "pt", level: "A2", active: false },
      { target_lang: "en", through_lang: "pt", level: "B1", active: true },
      { target_lang: "es", through_lang: "en", level: "A1", active: false },
    ];
    expect(orderTracks(tracks, "en").map((track) => track.target_lang)).toEqual(["en", "es"]);
    expect(orderTracks([], "en")).toEqual([]);
  });

  test("ofensiva no singular e no plural", () => {
    expect(streakText(1, PROFILE.pt)).toBe("1 dia seguido");
    expect(streakText(5, PROFILE.en)).toBe("5 days in a row");
  });

  test("nome e frase das mentes traduzidos, com retorno seguro para id desconhecido", () => {
    expect(mindName("plato", PROFILE.de)).toBe("Platon");
    expect(mindLine("galileo", PROFILE.it)).toBe("Eppur si muove.");
    expect(mindName("ninguem", PROFILE.pt)).toBe("ninguem");
    expect(mindLine("ninguem", PROFILE.pt)).toBe("");
  });
});

test.describe("Você: textos nos 7 idiomas", () => {
  test("mesmas chaves, nenhum texto vazio e as mesmas variáveis", () => {
    const reference = PROFILE.pt;
    for (const locale of DISPLAY_LOCALES) {
      const table = PROFILE[locale];
      expect(Object.keys(table).sort(), locale).toEqual(Object.keys(reference).sort());
      for (const [key, value] of Object.entries(table)) {
        if (typeof value !== "string") {
          continue;
        }
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        expect(placeholders(value), `${locale}.${key}`).toEqual(placeholders(reference[key as keyof typeof reference] as string));
      }
    }
  });

  test("todo descritor do can-do de lib/can-do.ts está traduzido nos 7 idiomas", () => {
    for (const band of CEFR_BANDS) {
      for (const item of canDoFor(band)) {
        for (const locale of DISPLAY_LOCALES) {
          expect(PROFILE[locale].canDo[item.id]?.trim().length ?? 0, `${locale}.canDo.${item.id}`).toBeGreaterThan(0);
        }
        expect(PROFILE.pt.canDo[item.id]).toBe(item.text.pt);
        expect(PROFILE.en.canDo[item.id]).toBe(item.text.en);
      }
    }
  });

  test("as 16 mentes têm nome e frase nos 7 idiomas", () => {
    expect(MINDS).toHaveLength(16);
    for (const mind of MINDS) {
      for (const locale of DISPLAY_LOCALES) {
        expect(PROFILE[locale].minds[mind.id].name.trim().length, `${locale}.${mind.id}`).toBeGreaterThan(0);
        expect(PROFILE[locale].minds[mind.id].line.trim().length, `${locale}.${mind.id}`).toBeGreaterThan(0);
      }
      expect(PROFILE.pt.minds[mind.id].line).toBe(mind.line.pt);
    }
  });
});
