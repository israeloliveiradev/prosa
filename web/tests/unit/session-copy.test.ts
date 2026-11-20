import { test, expect } from "@playwright/test";
import { SESSION_COPY, fill } from "@/lib/copy/session";
import { mindCopy, mindRole } from "@/lib/cast";
import { MINDS } from "@/design/minds";
import { DISPLAY_LOCALES } from "@/lib/i18n";
import { contrastForDay, contrastsFor, localizeSoundNote } from "@/lib/pronunciation-contrasts";

function placeholders(text: string): string[] {
  return Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1] ?? "").sort();
}

test.describe("sessão: textos nos 7 idiomas", () => {
  test("mesmas chaves, nenhum texto vazio e os mesmos marcadores", () => {
    const reference = Object.keys(SESSION_COPY.pt).sort();
    for (const locale of DISPLAY_LOCALES) {
      const table = SESSION_COPY[locale] as Record<string, string>;
      expect(Object.keys(table).sort(), locale).toEqual(reference);
      for (const key of reference) {
        const text = table[key] ?? "";
        expect(text.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        expect(placeholders(text), `${locale}.${key}`).toEqual(placeholders((SESSION_COPY.pt as Record<string, string>)[key] ?? ""));
      }
    }
  });

  test("fill troca os marcadores e preserva os desconhecidos", () => {
    expect(fill("Etapa {n} de {total}", { n: 2, total: 6 })).toBe("Etapa 2 de 6");
    expect(fill("{a} e {b}", { a: "x" })).toBe("x e {b}");
  });
});

test.describe("elenco: papéis nos 7 idiomas", () => {
  test("cada mente tem papel, frase e bio em todos os idiomas de interface", () => {
    for (const locale of DISPLAY_LOCALES) {
      for (const mind of MINDS) {
        const text = mindCopy(mind, locale);
        expect(text.role.length, `${locale}.${mind.id}.role`).toBeGreaterThan(0);
        expect(text.line.length, `${locale}.${mind.id}.line`).toBeGreaterThan(0);
        expect(text.bio.length, `${locale}.${mind.id}.bio`).toBeGreaterThan(0);
      }
    }
    expect(mindRole("memory", "de")).toBe("Gedächtnis");
    expect(mindRole("speech", "ja")).toBe("話す");
  });
});

test.describe("contrastes de pronúncia nos 7 idiomas", () => {
  test("todos os contrastes têm nome e dica em cada idioma de interface", () => {
    for (const target of ["en", "es", "fr", "de", "it", "ru", "ja"]) {
      const list = contrastsFor("pt", target);
      expect(list.length, target).toBeGreaterThan(0);
      for (const contrast of list) {
        for (const locale of DISPLAY_LOCALES) {
          expect(contrast.name[locale]?.trim().length, `${contrast.id}.name.${locale}`).toBeGreaterThan(0);
          expect(contrast.hint[locale]?.trim().length, `${contrast.id}.hint.${locale}`).toBeGreaterThan(0);
        }
      }
    }
  });

  test("apoio em outro idioma cai nos contrastes do português (pt é só apoio)", () => {
    expect(contrastsFor("en", "de").length).toBeGreaterThan(0);
    expect(contrastForDay("pt", "en", "2026-11-19")).not.toBeNull();
  });

  test("as notas de som da API (pt/en) aparecem no idioma da interface", () => {
    const note = {
      sound: { pt: "ü e ö", en: "ü and ö" },
      hint: { pt: "Schön arredonda. Schon não.", en: "Schön is rounded. Schon is not." },
    };
    expect(localizeSoundNote(note, "de")).toEqual({
      sound: "ü und ö",
      hint: "Schön wird mit runden Lippen gesprochen. Schon nicht.",
    });
    expect(localizeSoundNote(note, "ja").sound).toBe("üとö");
    const unknown = { sound: { pt: "som", en: "sound" }, hint: { pt: "dica", en: "hint" } };
    expect(localizeSoundNote(unknown, "pt")).toEqual({ sound: "som", hint: "dica" });
    expect(localizeSoundNote(unknown, "fr")).toEqual({ sound: "sound", hint: "hint" });
  });
});
