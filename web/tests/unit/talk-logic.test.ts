import { test, expect } from "@playwright/test";
import {
  classifyFailure,
  fill,
  languageLabel,
  proseTopic,
  storyExcerpt,
  talkTabFromParam,
  trimHistory,
} from "@/components/persona/talk-logic";
import { TALK } from "@/lib/copy/talk";
import { DISPLAY_LOCALES } from "@/lib/i18n";

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test.describe("Conversa: lógica pura", () => {
  test("aba de /talk vem do parâmetro ?tab=, com Mentor como padrão", () => {
    expect(talkTabFromParam("scenes")).toBe("scenes");
    expect(talkTabFromParam(["scenes", "mentor"])).toBe("scenes");
    expect(talkTabFromParam("mentor")).toBe("mentor");
    expect(talkTabFromParam(undefined)).toBe("mentor");
    expect(talkTabFromParam("qualquer")).toBe("mentor");
  });

  test("classifica falha de rede, de IA, de fonte de notícia e outras", () => {
    expect(classifyFailure(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyFailure(new Error("NetworkError when attempting to fetch resource."))).toBe("network");
    expect(classifyFailure(new Error("A API não respondeu."), [], ["A API não respondeu."])).toBe("network");
    expect(classifyFailure(new Error("O modelo está ocupado."), ["O modelo está ocupado."])).toBe("ai");
    expect(classifyFailure(new Error("Model request failed"))).toBe("ai");
    expect(classifyFailure(new Error("Lesson generation is paused"))).toBe("ai");
    expect(classifyFailure(new Error("News feed is unavailable"))).toBe("feed");
    expect(classifyFailure(new Error("Invalid scene"))).toBe("other");
    expect(classifyFailure("texto solto")).toBe("other");
    expect(classifyFailure(null)).toBe("other");
  });

  test("histórico respeita o limite do backend: falas não vazias, até 500 caracteres, as mais recentes", () => {
    const turns = [
      { role: "mind" as const, text: "a" },
      { role: "learner" as const, text: "   " },
      { role: "mind" as const, text: "b" },
      { role: "learner" as const, text: "x".repeat(700) },
    ];
    const trimmed = trimHistory(turns, 2);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]).toEqual({ role: "mind", text: "b" });
    expect(trimmed[1].text).toHaveLength(500);
    expect(trimHistory([], 8)).toEqual([]);
  });

  test("tema do mentor usa o primeiro candidato válido e cabe em 2–80 caracteres", () => {
    expect(proseTopic([null, " ", "Tecnologia e IA"])).toBe("Tecnologia e IA");
    expect(proseTopic(["x"])).toBe("everyday life");
    expect(proseTopic(["y".repeat(120)])).toHaveLength(80);
  });

  test("trecho da lição cabe em 700 caracteres", () => {
    expect(storyExcerpt(undefined)).toBeUndefined();
    expect(storyExcerpt("  curto  ")).toBe("curto");
    const long = storyExcerpt("palavra ".repeat(200));
    expect(long?.length).toBeLessThanOrEqual(700);
    expect(long?.endsWith("…")).toBe(true);
  });

  test("fill troca só as chaves conhecidas", () => {
    expect(fill("{name} responde em {lang}", { name: "Feynman", lang: "inglês" })).toBe("Feynman responde em inglês");
    expect(fill("{n} falas e {x}", { n: 8 })).toBe("8 falas e {x}");
  });

  test("nome do idioma sai no idioma da interface", () => {
    expect(languageLabel("en", "pt-BR").toLowerCase()).toBe("inglês");
    expect(languageLabel("de", "de")).toBe("Deutsch");
    expect(languageLabel("ja", "ja")).toBe("日本語");
  });
});

test.describe("Conversa: textos nos 7 idiomas", () => {
  test("mesmas chaves, nenhum texto vazio e as mesmas variáveis em todos os idiomas", () => {
    const reference = TALK.pt;
    for (const locale of DISPLAY_LOCALES) {
      const table = TALK[locale];
      expect(Object.keys(table).sort(), locale).toEqual(Object.keys(reference).sort());
      for (const [key, value] of Object.entries(table)) {
        expect(typeof value, `${locale}.${key}`).toBe("string");
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        expect(placeholders(value), `${locale}.${key}`).toEqual(placeholders(reference[key as keyof typeof reference]));
      }
    }
  });
});
