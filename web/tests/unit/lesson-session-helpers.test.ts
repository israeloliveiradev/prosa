import { test, expect } from "@playwright/test";
import { DEFAULT_TOPIC, chooseTopic, isLessonWord, readingFloorSeconds, sessionDate, speechLocale } from "@/lib/lesson";

test.describe("lição do dia: tema", () => {
  test("o tema pedido na URL vence tudo (e é cortado em 120 caracteres)", () => {
    expect(chooseTopic({ param: "  cooking  ", cached: "travel", interests: ["music"], date: "2026-11-19" })).toBe("cooking");
    expect(chooseTopic({ param: "x".repeat(200), date: "2026-11-19" })).toHaveLength(120);
  });

  test("sem tema na URL, retoma o tema já aberto hoje", () => {
    expect(chooseTopic({ param: "", cached: "travel", interests: ["music"], date: "2026-11-19" })).toBe("travel");
  });

  test("sem tema aberto, gira pelos interesses do aluno conforme o dia", () => {
    const interests = ["music", "football", "cinema"];
    const first = chooseTopic({ interests, date: "2026-11-19" });
    const next = chooseTopic({ interests, date: "2026-11-20" });
    expect(interests).toContain(first);
    expect(interests).toContain(next);
    expect(next).not.toBe(first);
    expect(chooseTopic({ interests, date: "2026-11-19" })).toBe(first);
  });

  test("sem interesses, usa o tema padrão da API", () => {
    expect(chooseTopic({ interests: [], date: "2026-11-19" })).toBe(DEFAULT_TOPIC);
    expect(chooseTopic({ interests: ["  "], date: "2026-11-19" })).toBe(DEFAULT_TOPIC);
  });
});

test.describe("lição do dia: leitura e datas", () => {
  test("tempo mínimo de leitura cresce com o texto e nunca é menor que 15 s", () => {
    expect(readingFloorSeconds(0)).toBe(15);
    expect(readingFloorSeconds(40)).toBe(15);
    expect(readingFloorSeconds(240)).toBe(60);
  });

  test("sessionDate aceita só AAAA-MM-DD", () => {
    expect(sessionDate("2026-11-18", "2026-11-19")).toBe("2026-11-18");
    expect(sessionDate("ontem", "2026-11-19")).toBe("2026-11-19");
    expect(sessionDate(undefined, "2026-11-19")).toBe("2026-11-19");
    expect(sessionDate(["2026-11-18"], "2026-11-19")).toBe("2026-11-19");
  });

  test("speechLocale cobre os 7 idiomas-alvo e o português de apoio", () => {
    expect(speechLocale("en")).toBe("en-US");
    expect(speechLocale("de")).toBe("de-DE");
    expect(speechLocale("it")).toBe("it-IT");
    expect(speechLocale("ja")).toBe("ja-JP");
    expect(speechLocale("ru")).toBe("ru-RU");
    expect(speechLocale("es")).toBe("es-ES");
    expect(speechLocale("fr")).toBe("fr-FR");
    expect(speechLocale("pt")).toBe("pt-BR");
  });
});

test.describe("lição do dia: destaque de vocabulário", () => {
  const vocabulary = [
    { word: "the same", translation: "o mesmo", example_sentence: "It is the same." },
    { word: "morning", translation: "manhã", example_sentence: "Every morning." },
    { word: "every morning", translation: "toda manhã", example_sentence: "Every morning I run." },
  ];

  test("destaca entradas de uma palavra e partes longas de expressões", () => {
    expect(isLessonWord(vocabulary, "Morning,")).toBe(true);
    expect(isLessonWord(vocabulary, "same")).toBe(true);
    expect(isLessonWord(vocabulary, "every")).toBe(true);
  });

  test("não destaca palavras curtas só porque aparecem numa expressão", () => {
    expect(isLessonWord(vocabulary, "the")).toBe(false);
    expect(isLessonWord(vocabulary, "train")).toBe(false);
    expect(isLessonWord(vocabulary, "...")).toBe(false);
  });
});
