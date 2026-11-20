import { test, expect } from "@playwright/test";
import { initialFor, isActivePath, languageLabel, orderTracks, shellLayoutFor } from "@/features/shell/model/shell-model";

test.describe("shell: lógica pura", () => {
  test("layout por largura: abas < 768, trilho 768–1023, barra lateral ≥ 1024", () => {
    expect(shellLayoutFor(390)).toBe("phone");
    expect(shellLayoutFor(767)).toBe("phone");
    expect(shellLayoutFor(768)).toBe("rail");
    expect(shellLayoutFor(1023)).toBe("rail");
    expect(shellLayoutFor(1024)).toBe("wide");
    expect(shellLayoutFor(1440)).toBe("wide");
  });

  test("destino ativo: raiz só casa com a raiz; os outros por segmento", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/index", "/")).toBe(true);
    expect(isActivePath("/path", "/")).toBe(false);
    expect(isActivePath("/path", "/path")).toBe(true);
    expect(isActivePath("/path/", "/path")).toBe(true);
    expect(isActivePath("/path/a1", "/path")).toBe(true);
    expect(isActivePath("/pathology", "/path")).toBe(false);
    expect(isActivePath("/news", "/talk")).toBe(false);
  });

  test("nome do idioma no idioma da interface, com inicial maiúscula", () => {
    expect(languageLabel("en", "pt-BR")).toBe("Inglês");
    expect(languageLabel("de", "en")).toBe("German");
    expect(languageLabel("ja", "fr")).toBe("Japonais");
    expect(languageLabel("ru", "de")).toBe("Russisch");
    expect(languageLabel("es", "ja")).toBe("スペイン語");
    expect(languageLabel("", "en")).toBe("");
  });

  test("cursos: sem português como alvo, sem duplicatas, o atual primeiro", () => {
    const list = orderTracks(
      [
        { target_lang: "es", through_lang: "pt", level: "A2", active: false },
        { target_lang: "pt", through_lang: "en", level: "B1", active: false },
        { target_lang: "en", through_lang: "pt", level: "B1", active: false },
        { target_lang: "ES", through_lang: "pt", level: "A1", active: false },
      ],
      { target_lang: "en", native_lang: "pt", level: "B1" },
    );
    expect(list.map((item) => item.target_lang)).toEqual(["en", "es"]);
    expect(list[0]?.active).toBe(true);
    expect(list[1]?.active).toBe(false);
  });

  test("cursos: o curso da sessão entra mesmo se a API não o listar", () => {
    const list = orderTracks([], { target_lang: "de", native_lang: "pt", level: "A1" });
    expect(list).toEqual([{ target_lang: "de", through_lang: "pt", level: "A1", active: true }]);
  });

  test("inicial do avatar: nome de exibição, senão o e-mail", () => {
    expect(initialFor("ana lima", "x@y.z")).toBe("A");
    expect(initialFor(null, "bruno@prosa.test")).toBe("B");
    expect(initialFor("  ", "émile@prosa.test")).toBe("É");
  });
});
