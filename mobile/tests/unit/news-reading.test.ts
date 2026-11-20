import { test, expect } from "@playwright/test";
import { READING, defaultNewsLevel, isNewsTheme, newsBandsFor, newsThemeList, themeLabel } from "@/lib/copy/reading";
import { DISPLAY_LOCALES } from "@/lib/i18n";
import { NEWS_THEMES } from "@/lib/themes";

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test.describe("Leitura: faixas de nível", () => {
  test("oferece uma faixa abaixo, a do aluno e uma acima", () => {
    expect(newsBandsFor("B1")).toEqual([
      { id: "A2", relation: "easier" },
      { id: "B1", relation: "yours" },
      { id: "B2", relation: "harder" },
    ]);
  });

  test("nas pontas não inventa faixa fora do CEFR", () => {
    expect(newsBandsFor("A1").map((band) => band.id)).toEqual(["A1", "A2"]);
    expect(newsBandsFor("C2").map((band) => band.id)).toEqual(["C1", "C2"]);
  });

  test("nível inválido ou ausente cai em A2", () => {
    expect(defaultNewsLevel(undefined)).toBe("A2");
    expect(defaultNewsLevel("Z9")).toBe("A2");
    expect(defaultNewsLevel("C1")).toBe("C1");
    expect(newsBandsFor(null).find((band) => band.relation === "yours")?.id).toBe("A2");
  });
});

test.describe("Leitura: temas", () => {
  test("sem interesses, usa os 8 temas canônicos", () => {
    expect(newsThemeList(undefined)).toEqual([...NEWS_THEMES]);
    expect(newsThemeList([])).toEqual([...NEWS_THEMES]);
  });

  test("interesses do perfil vêm primeiro, inclusive temas livres, sem duplicar", () => {
    const list = newsThemeList(["Ciência", "astronomia", "ciência", " ", "x"]);
    expect(list.slice(0, 2)).toEqual(["Ciência", "astronomia"]);
    expect(list.filter((item) => item.toLowerCase() === "ciência")).toHaveLength(1);
    expect(list).not.toContain("x");
    expect(list).toHaveLength(NEWS_THEMES.length + 1);
  });

  test("rótulo traduz o tema canônico e mantém o tema livre", () => {
    expect(themeLabel("Tecnologia e IA", READING.de)).toBe("Technik & KI");
    expect(themeLabel("astronomia", READING.de)).toBe("astronomia");
    expect(isNewsTheme("Música")).toBe(true);
    expect(isNewsTheme("Musica")).toBe(false);
  });
});

test.describe("Leitura: textos nos 7 idiomas", () => {
  test("mesmas chaves, temas completos, nenhum texto vazio e as mesmas variáveis", () => {
    const reference = READING.pt;
    for (const locale of DISPLAY_LOCALES) {
      const table = READING[locale];
      expect(Object.keys(table).sort(), locale).toEqual(Object.keys(reference).sort());
      expect(Object.keys(table.themes).sort(), `${locale}.themes`).toEqual([...NEWS_THEMES].sort());
      for (const theme of NEWS_THEMES) {
        expect(table.themes[theme].trim().length, `${locale}.themes.${theme}`).toBeGreaterThan(0);
      }
      for (const [key, value] of Object.entries(table)) {
        if (typeof value !== "string") {
          continue;
        }
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        expect(placeholders(value), `${locale}.${key}`).toEqual(placeholders(reference[key as keyof typeof reference] as string));
      }
    }
  });
});
