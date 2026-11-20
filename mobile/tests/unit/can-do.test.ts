import { test, expect } from "@playwright/test";
import { CEFR_BANDS, canDoFor, canDoScore, canDoSignals, canDoText } from "@/lib/can-do";
import { DISPLAY_LOCALES } from "@/lib/i18n";

test.describe("can-do: descritores por faixa", () => {
  test("cada faixa tem quatro descritores (leitura, escuta, fala, escrita) nos 7 idiomas", () => {
    for (const band of CEFR_BANDS) {
      const items = canDoFor(band);
      expect(items.map((item) => item.skill).sort()).toEqual(["listening", "reading", "speaking", "writing"]);
      for (const item of items) {
        for (const locale of DISPLAY_LOCALES) {
          expect(item.text[locale], `${item.id} em ${locale}`).toBeTruthy();
          expect(item.text[locale].trim().length).toBeGreaterThan(5);
        }
      }
    }
  });

  test("ids são únicos entre todas as faixas", () => {
    const ids = CEFR_BANDS.flatMap((band) => canDoFor(band).map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("traduções são de fato diferentes do português e do inglês", () => {
    const item = canDoFor("B1")[0]!;
    expect(canDoText(item, "de")).not.toBe(item.text.en);
    expect(canDoText(item, "ja")).not.toBe(item.text.pt);
    expect(canDoText(item, "fr")).toContain("lire");
  });

  test("faixa desconhecida não devolve descritores inventados", () => {
    expect(canDoFor("Z9")).toEqual([]);
    expect(canDoFor("")).toEqual([]);
    expect(canDoFor("b2").length).toBe(4);
  });

  test("canDoFor devolve cópias (mexer no resultado não altera a tabela)", () => {
    const first = canDoFor("A1");
    first[0]!.text.pt = "alterado";
    expect(canDoFor("A1")[0]!.text.pt).not.toBe("alterado");
  });
});

test.describe("can-do: autoavaliação", () => {
  test("canDoScore é a parte marcada da faixa", () => {
    expect(canDoScore([], "B1")).toBe(0);
    expect(canDoScore(["b1-read", "b1-write"], "B1")).toBe(50);
    expect(canDoScore(["a1-read"], "B1")).toBe(0);
    expect(canDoScore(["x"], "Z9")).toBe(0);
  });

  test("canDoSignals manda só fala (fluency) e escrita (writing)", () => {
    expect(canDoSignals(["b2-speak"], "B2")).toEqual({ fluency: 100, writing: 0 });
    expect(canDoSignals(["b2-read", "b2-listen"], "B2")).toEqual({ fluency: 0, writing: 0 });
    expect(canDoSignals([], "Z9")).toEqual({});
  });
});
