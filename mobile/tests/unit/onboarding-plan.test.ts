import { test, expect } from "@playwright/test";
import {
  MAX_THEMES,
  NEWS_THEMES,
  addTheme,
  canonicalTheme,
  hasTheme,
  normalizeTheme,
  presetFromLabel,
  removeTheme,
  sanitizeThemes,
  themeKey,
  themeLabel,
  toggleTheme,
  type NewsTheme,
} from "../../src/lib/themes";
import {
  buildPlanInput,
  errorMessage,
  levelFromOutcome,
  mergeTracks,
  saveErrorKind,
  trackLevel,
} from "../../src/features/onboarding/model/plan-input";
import { displayLanguageName } from "../../src/features/onboarding/model/language-name";

const EN_LABELS: Record<NewsTheme, string> = {
  "Tecnologia e IA": "Technology & AI",
  Filosofia: "Philosophy",
  Viagens: "Travel",
  Negócios: "Business",
  "Cultura pop": "Pop culture",
  Cozinha: "Cooking",
  Ciência: "Science",
  Música: "Music",
};

test.describe("Onboarding: temas", () => {
  test("os 8 temas fixos continuam com os IDs que o backend de notícias conhece", () => {
    expect(NEWS_THEMES).toHaveLength(8);
    expect(NEWS_THEMES).toContain("Tecnologia e IA");
    expect(MAX_THEMES).toBe(12);
  });

  test("normaliza espaços, corta em 48 e compara sem acento nem caixa", () => {
    expect(normalizeTheme("   xadrez    clássico  ")).toBe("xadrez clássico");
    expect(normalizeTheme("a".repeat(80))).toHaveLength(48);
    expect(themeKey("Música")).toBe(themeKey("MUSICA"));
    expect(hasTheme(["Ciência"], "ciencia")).toBe(true);
    expect(hasTheme(["Ciência"], "")).toBe(false);
  });

  test("texto livre igual a um fixo vira o ID canônico", () => {
    expect(canonicalTheme("musica")).toBe("Música");
    expect(canonicalTheme("fotografia")).toBe("fotografia");
    expect(presetFromLabel("music", EN_LABELS)).toBe("Música");
    expect(presetFromLabel("Pop Culture", EN_LABELS)).toBe("Cultura pop");
    expect(presetFromLabel("chess", EN_LABELS)).toBeNull();
    expect(themeLabel("Ciência", EN_LABELS)).toBe("Science");
    expect(themeLabel("xadrez", EN_LABELS)).toBe("xadrez");
  });

  test("addTheme informa vazio, duplicata e lista cheia", () => {
    expect(addTheme([], "   ").status).toBe("empty");
    expect(addTheme(["Ciência"], "CIÊNCIA").status).toBe("duplicate");
    const twelve = Array.from({ length: 12 }, (_, i) => `t${i}`);
    expect(addTheme(twelve, "novo")).toEqual({ list: twelve, status: "full" });
    expect(addTheme(["Ciência"], "xadrez")).toEqual({ list: ["Ciência", "xadrez"], status: "added" });
  });

  test("toggle/remove e sanitize (sem vazios, sem duplicatas, no máximo 12)", () => {
    expect(toggleTheme([], "Música")).toEqual(["Música"]);
    expect(toggleTheme(["Música"], "musica")).toEqual([]);
    expect(removeTheme(["a", "B", "c"], "b")).toEqual(["a", "c"]);
    const messy = ["", "  ", "Ciência", "ciencia", 42, "xadrez", ...Array.from({ length: 20 }, (_, i) => `t${i}`)];
    const clean = sanitizeThemes(messy);
    expect(clean[0]).toBe("Ciência");
    expect(clean[1]).toBe("xadrez");
    expect(clean).toHaveLength(12);
  });
});

test.describe("Onboarding: corpo do POST /onboarding/quiz", () => {
  test("mergeTracks mantém os outros cursos e põe o escolhido como ativo", () => {
    const tracks = mergeTracks(
      [
        { target_lang: "en", through_lang: "pt", level: "B2", active: true },
        { target_lang: "de", through_lang: "pt", level: "A1", active: false },
        { target_lang: "pt", through_lang: "en", level: "B1" },
        { target_lang: "fr", through_lang: "fr", level: "B1" },
      ],
      { target_lang: "de", through_lang: "en", level: "A2" },
    );
    expect(tracks).toEqual([
      { target_lang: "de", through_lang: "en", level: "A2", active: true },
      { target_lang: "en", through_lang: "pt", level: "B2", active: false },
    ]);
    expect(tracks.filter((track) => track.active)).toHaveLength(1);
  });

  test("trackLevel acha o nível do curso existente", () => {
    const existing = [{ target_lang: "en", through_lang: "pt", level: "B2" }];
    expect(trackLevel(existing, "en")).toBe("B2");
    expect(trackLevel(existing, "ja")).toBeNull();
  });

  test("buildPlanInput envia par, temas limpos, nível, objetivo composto e trilhas", () => {
    const input = buildPlanInput(
      {
        target_lang: "ja",
        through_lang: "pt",
        level: "A1",
        interests: ["Música", "musica", " xadrez "],
        goal: "culture",
        goal_note: "anime sem legenda",
      },
      [{ target_lang: "en", through_lang: "pt", level: "B1", active: true }],
    );
    expect(input).toEqual({
      interests: ["Música", "xadrez"],
      goal: "culture: anime sem legenda",
      level: "A1",
      target_lang: "ja",
      through_lang: "pt",
      tracks: [
        { target_lang: "ja", through_lang: "pt", level: "A1", active: true },
        { target_lang: "en", through_lang: "pt", level: "B1", active: false },
      ],
    });
  });

  test("sem objetivo, o campo goal não vai", () => {
    const input = buildPlanInput({
      target_lang: "en",
      through_lang: "pt",
      level: "B1",
      interests: ["Ciência"],
      goal: null,
      goal_note: "",
    });
    expect("goal" in input).toBe(false);
  });

  test("levelFromOutcome lê o contrato do nivelamento e formatos da API", () => {
    expect(levelFromOutcome({ level: "B1", bands: [], skills: [] })).toBe("B1");
    expect(levelFromOutcome({ result_level: "c1" })).toBe("C1");
    expect(levelFromOutcome({ result: { level: "A2" } })).toBe("A2");
    expect(levelFromOutcome("b2")).toBe("B2");
    expect(levelFromOutcome({ level: "Z9" })).toBeNull();
    expect(levelFromOutcome(null)).toBeNull();
  });

  test("saveErrorKind separa rede, limite de taxa e o resto; errorMessage escolhe o texto", () => {
    expect(saveErrorKind({ kind: "network", status: null })).toBe("offline");
    expect(saveErrorKind({ kind: "timeout", status: null })).toBe("offline");
    expect(saveErrorKind({ kind: "http", status: 429 })).toBe("busy");
    expect(saveErrorKind({ kind: "http", status: 400 })).toBe("failed");
    expect(saveErrorKind(new TypeError("Failed to fetch"))).toBe("offline");
    expect(saveErrorKind("boom")).toBe("failed");
    const texts = { errorOffline: "off", errorBusy: "busy", errorFailed: "fail" };
    expect(errorMessage(texts, "offline")).toBe("off");
    expect(errorMessage(texts, "busy")).toBe("busy");
    expect(errorMessage(texts, "failed")).toBe("fail");
  });

  test("nome do idioma vem do Intl.DisplayNames no idioma da interface", () => {
    expect(displayLanguageName("en", "pt-BR")).toBe("Inglês");
    expect(displayLanguageName("de", "de")).toBe("Deutsch");
    expect(displayLanguageName("ja", "ja")).toBe("日本語");
    expect(displayLanguageName("ru", "fr")).toBe("Russe");
    expect(displayLanguageName("!!", "en", () => "fallback")).toBe("fallback");
  });
});
