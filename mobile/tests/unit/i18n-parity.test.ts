import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { COPY, DISPLAY_LOCALES, copy, isDisplayLocale, phaseName, type DisplayLocale } from "@/lib/i18n";
import { MESSAGES } from "@/lib/messages";
import { isAreaTable } from "@/lib/copy/area";
import { STUDY_LANGUAGES, THROUGH_LANGUAGES, endonym, languageName, languageNameInline, trackLabel } from "@/lib/languages";

/**
 * Paridade dos textos de interface nos 7 idiomas.
 *
 * Confere COPY (i18n.ts), MESSAGES (messages.ts) e TODA tabela de área em
 * src/lib/copy/*.ts (descobertas pelo nome do arquivo): mesmas chaves em todos
 * os idiomas, mesmo tipo por chave, nenhum texto vazio, os mesmos {placeholders},
 * funções presentes em todos e nada copiado sem tradução de pt/en.
 */

type Leaf =
  | { kind: "string"; value: string }
  | { kind: "function"; arity: number }
  | { kind: "number" | "boolean" | "null" | "undefined" | "other" };

const COPY_DIR = path.resolve(__dirname, "../../src/lib/copy");
const HELPER_FILES = new Set(["area.ts"]);

function flatten(value: unknown, prefix: string, out: Map<string, Leaf>): Map<string, Leaf> {
  if (typeof value === "string") {
    out.set(prefix, { kind: "string", value });
  } else if (typeof value === "function") {
    out.set(prefix, { kind: "function", arity: value.length });
  } else if (typeof value === "number" || typeof value === "boolean") {
    out.set(prefix, { kind: value === true || value === false ? "boolean" : "number" });
  } else if (value === null) {
    out.set(prefix, { kind: "null" });
  } else if (value === undefined) {
    out.set(prefix, { kind: "undefined" });
  } else if (Array.isArray(value)) {
    out.set(`${prefix}[]`, { kind: "number" });
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
  } else if (typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      flatten(item, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, { kind: "other" });
  }
  return out;
}

function placeholders(text: string): string {
  return [...new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1]))].sort().join(",");
}

/**
 * Palavras de verdade (sem os {placeholders}), para não acusar "{right} de {total}".
 * Um token sem espaço (e-mail, URL, código) não conta como frase.
 */
function wordCount(text: string): number {
  const prose = text.replace(/\{\w+\}/g, " ").trim();
  if (!/\s/.test(prose)) {
    return 0;
  }
  return (prose.match(/\p{L}{2,}/gu) ?? []).length;
}

/**
 * Idiomas em que repetir o texto do português é quase sempre esquecimento de tradução.
 * Espanhol e italiano dividem muitas frases curtas com o português ("Abrir este tema").
 */
const DISTANT_FROM_PT: ReadonlySet<DisplayLocale> = new Set(["de", "fr", "ja"]);

/** Lista legível de problemas de uma tabela {pt, en, de, fr, es, it, ja}. */
function parityProblems(name: string, table: unknown): string[] {
  const problems: string[] = [];
  if (typeof table !== "object" || table === null) {
    return [`${name}: não é uma tabela de idiomas`];
  }
  const record = table as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!isDisplayLocale(key)) {
      problems.push(`${name}: chave "${key}" não é um idioma de interface`);
    }
  }
  const missing = DISPLAY_LOCALES.filter((locale) => record[locale] === undefined);
  if (missing.length > 0) {
    problems.push(`${name}: faltam os idiomas ${missing.join(", ")}`);
    return problems;
  }
  const leaves = Object.fromEntries(DISPLAY_LOCALES.map((locale) => [locale, flatten(record[locale], "", new Map())])) as Record<
    DisplayLocale,
    Map<string, Leaf>
  >;
  const base = leaves.pt;
  for (const locale of DISPLAY_LOCALES) {
    const current = leaves[locale];
    const absent = [...base.keys()].filter((key) => !current.has(key));
    const extra = [...current.keys()].filter((key) => !base.has(key));
    if (absent.length > 0) {
      problems.push(`${name}.${locale}: faltam ${absent.join(", ")}`);
    }
    if (extra.length > 0) {
      problems.push(`${name}.${locale}: chaves a mais ${extra.join(", ")}`);
    }
    for (const [key, leaf] of current) {
      const reference = base.get(key);
      if (!reference) {
        continue;
      }
      if (leaf.kind !== reference.kind) {
        problems.push(`${name}.${locale}.${key}: tipo ${leaf.kind}, em pt é ${reference.kind}`);
        continue;
      }
      if (leaf.kind === "function" && reference.kind === "function" && leaf.arity !== reference.arity) {
        problems.push(`${name}.${locale}.${key}: função com ${leaf.arity} argumentos, em pt são ${reference.arity}`);
      }
      if (leaf.kind === "undefined" || leaf.kind === "null") {
        problems.push(`${name}.${locale}.${key}: valor ${leaf.kind}`);
      }
      if (leaf.kind !== "string" || reference.kind !== "string") {
        continue;
      }
      if (leaf.value.trim() === "") {
        problems.push(`${name}.${locale}.${key}: texto vazio`);
      }
      if (placeholders(leaf.value) !== placeholders(reference.value)) {
        problems.push(
          `${name}.${locale}.${key}: placeholders {${placeholders(leaf.value)}} diferentes de pt {${placeholders(reference.value)}}`,
        );
      }
      if (locale === "pt" || locale === "en") {
        continue;
      }
      const en = leaves.en.get(key);
      const enText = en?.kind === "string" ? en.value : null;
      const ptText = reference.value;
      if (enText !== null && leaf.value === enText && enText !== ptText && wordCount(enText) >= 3) {
        problems.push(`${name}.${locale}.${key}: copiado do inglês sem tradução ("${enText}")`);
      } else if (DISTANT_FROM_PT.has(locale) && leaf.value === ptText && ptText !== enText && wordCount(ptText) >= 3) {
        problems.push(`${name}.${locale}.${key}: copiado do português sem tradução ("${ptText}")`);
      }
    }
  }
  return problems;
}

/** Tabelas de idioma exportadas por um módulo de área. */
function localeTables(mod: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(mod).filter(([, value]) => {
    if (isAreaTable(value)) {
      return true;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }
    const record = value as Record<string, unknown>;
    return typeof record.pt === "object" && record.pt !== null && typeof record.en === "object" && record.en !== null;
  });
}

const areaFiles = fs
  .readdirSync(COPY_DIR)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts") && !HELPER_FILES.has(file))
  .sort();

/**
 * Os módulos de área são carregados na coleta do arquivo de teste: é nessa fase que o
 * Playwright resolve os aliases "@/…" do tsconfig para os imports internos deles.
 */
const areaModules = new Map<string, Record<string, unknown> | Error>(
  areaFiles.map((file): [string, Record<string, unknown> | Error] => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return [file, require(path.join(COPY_DIR, file)) as Record<string, unknown>];
    } catch (error) {
      return [file, error instanceof Error ? error : new Error(String(error))];
    }
  }),
);

test.describe("Paridade i18n: 7 idiomas de interface", () => {
  test("COPY (i18n.ts) tem as mesmas chaves, sem vazios e com os mesmos placeholders", () => {
    const problems = parityProblems("COPY", COPY);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("MESSAGES (messages.ts) tem as mesmas chaves, sem vazios e com os mesmos placeholders", () => {
    const problems = parityProblems("MESSAGES", MESSAGES);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("COPY e MESSAGES não disputam a mesma chave em useCopy()", () => {
    const shared = Object.keys(COPY.pt).filter((key) => key in MESSAGES.pt);
    expect(shared).toEqual([]);
  });

  test("copy(locale) entrega a tabela própria de cada idioma", () => {
    for (const locale of DISPLAY_LOCALES) {
      const ui = copy(locale);
      expect(ui.signIn).toBe(COPY[locale].signIn);
      expect(ui.tryAgain).toBe(MESSAGES[locale].tryAgain);
      expect(phaseName("listen", locale)).toBe(MESSAGES[locale].listenPhase);
    }
    expect(copy("de").signIn).not.toBe(copy("en").signIn);
    expect(copy("ja").tryAgain).not.toBe(copy("en").tryAgain);
  });

  test("greeting(name) existe em todos os idiomas e usa o nome", () => {
    for (const locale of DISPLAY_LOCALES) {
      const greet = COPY[locale].greeting;
      expect(greet("Ana"), locale).toContain("Ana");
      expect(greet("  Ana  "), locale).toBe(greet("Ana"));
      expect(greet("").trim().length, locale).toBeGreaterThan(0);
      expect(greet("   "), locale).toBe(greet(""));
      expect(greet(""), locale).not.toMatch(/[,、]\s*$/);
      expect(greet("você"), locale).toBe(greet(""));
    }
  });

  test("o detector acusa chave faltando, vazio, placeholder trocado, função ausente e cópia do inglês", () => {
    const ok = { title: "x", line: "{n} de {total}", say: (name: string) => name };
    const broken = {
      pt: { title: "Título", line: "{n} de {total}", say: (name: string) => name },
      en: { title: "The title of this", line: "{n} of {total}", say: (name: string) => name },
      de: { title: "   ", line: "{n} von {count}", say: (name: string) => name },
      fr: { title: "The title of this", line: "{n} sur {total}", say: (name: string) => name },
      es: { line: "{n} de {total}", say: (name: string) => name },
      it: { title: "Titolo", line: "{n} di {total}", say: "Ciao" },
      ja: { ...ok, extra: "余分" },
    };
    const problems = parityProblems("T", broken).join("\n");
    expect(problems).toContain("T.de.title: texto vazio");
    expect(problems).toContain("T.de.line: placeholders");
    expect(problems).toContain("T.fr.title: copiado do inglês");
    expect(problems).toContain("T.es: faltam title");
    expect(problems).toContain("T.it.say: tipo string");
    expect(problems).toContain("T.ja: chaves a mais extra");
    expect(parityProblems("U", { pt: ok, en: ok })).toContain("U: faltam os idiomas de, fr, es, it, ja");
  });

  test("há tabelas de área em src/lib/copy", () => {
    expect(areaFiles.length).toBeGreaterThan(0);
  });

  for (const file of areaFiles) {
    test(`área ${file}: todas as tabelas têm paridade nos 7 idiomas`, () => {
      const mod = areaModules.get(file);
      if (mod instanceof Error || mod === undefined) {
        throw new Error(`${file} não carregou no Node: ${mod?.message ?? "módulo ausente"}`);
      }
      const tables = localeTables(mod);
      expect(tables.length, `${file} não exporta nenhuma tabela defineArea({ pt, en, de, fr, es, it, ja })`).toBeGreaterThan(0);
      const problems = tables.flatMap(([name, table]) => parityProblems(`${file}:${name}`, table));
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
});

test.describe("Nomes de idioma nos 7 idiomas de interface", () => {
  test("todo idioma de estudo e de apoio tem nome em todo idioma de interface", () => {
    for (const locale of DISPLAY_LOCALES) {
      for (const { id } of THROUGH_LANGUAGES) {
        const name = languageName(id, locale);
        expect(name, `${locale}/${id}`).not.toBe(id);
        expect(name.length, `${locale}/${id}`).toBeGreaterThan(1);
        expect(name.charAt(0), `${locale}/${id}`).toBe(name.charAt(0).toLocaleUpperCase());
      }
    }
    expect(STUDY_LANGUAGES.map((item) => item.id)).toContain("ru");
    expect(STUDY_LANGUAGES.map((item) => item.id)).not.toContain("pt");
    expect(THROUGH_LANGUAGES.map((item) => item.id)).toContain("pt");
  });

  test("nomes conhecidos saem no idioma da interface", () => {
    expect(languageName("de", "pt")).toBe("Alemão");
    expect(languageName("de", "en")).toBe("German");
    expect(languageName("en", "de")).toBe("Englisch");
    expect(languageName("en", "fr")).toBe("Anglais");
    expect(languageName("ru", "es")).toBe("Ruso");
    expect(languageName("ja", "it")).toBe("Giapponese");
    expect(languageName("en", "ja")).toBe("英語");
    expect(languageNameInline("pt", "pt")).toBe("português");
    expect(languageNameInline("en", "de")).toBe("Englisch");
    expect(languageName("xx", "pt")).toBe("xx");
  });

  test("endônimos para o seletor de idioma", () => {
    expect(endonym("de")).toBe("Deutsch");
    expect(endonym("fr")).toBe("Français");
    expect(endonym("es")).toBe("Español");
    expect(endonym("ja")).toBe("日本語");
    expect(endonym("ru")).toBe("Русский");
    expect(endonym("pt")).toBe("Português");
  });

  test("trackLabel compõe o par com a gramática de cada idioma", () => {
    const deThroughEn = { target_lang: "de", through_lang: "en" };
    expect(trackLabel(deThroughEn, "pt")).toBe("Alemão através do inglês");
    expect(trackLabel(deThroughEn, "en")).toBe("German through English");
    expect(trackLabel(deThroughEn, "de")).toBe("Deutsch über Englisch");
    expect(trackLabel(deThroughEn, "fr")).toBe("Allemand à travers l’anglais");
    expect(trackLabel({ target_lang: "en", through_lang: "pt" }, "fr")).toBe("Anglais à travers le portugais");
    expect(trackLabel(deThroughEn, "es")).toBe("Alemán a través del inglés");
    expect(trackLabel(deThroughEn, "it")).toBe("Tedesco attraverso l’inglese");
    expect(trackLabel({ target_lang: "en", through_lang: "es" }, "it")).toBe("Inglese attraverso lo spagnolo");
    expect(trackLabel({ target_lang: "en", through_lang: "pt" }, "it")).toBe("Inglese attraverso il portoghese");
    expect(trackLabel(deThroughEn, "ja")).toBe("英語で学ぶドイツ語");
  });
});
