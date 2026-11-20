import { test, expect } from "@playwright/test";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/navigation/nav-items";
import { SHELL_COPY } from "@/lib/copy/shell";
import { DISPLAY_LOCALES } from "@/lib/i18n";

test.describe("navegação: 5 destinos", () => {
  test("Hoje, Trilha, Leitura, Conversa e Você, nesta ordem", () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.path)).toEqual(["/", "/path", "/news", "/talk", "/profile"]);
    expect(new Set(PRIMARY_NAV_ITEMS.map((item) => item.id)).size).toBe(5);
  });

  test("menu da conta leva a Ajustes e Como usar; nada de loja, liga ou baú", () => {
    expect(SECONDARY_NAV_ITEMS.map((item) => item.path)).toEqual(["/settings", "/guide"]);
    const paths = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => item.path as string);
    for (const fake of ["/org", "/score", "/paywall", "/duel"]) {
      expect(paths).not.toContain(fake);
    }
  });

  test("todo rótulo existe e é texto nos 7 idiomas", () => {
    for (const locale of DISPLAY_LOCALES) {
      for (const item of [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS]) {
        const label = SHELL_COPY[locale][item.labelKey];
        expect(typeof label, `${locale}.${item.labelKey}`).toBe("string");
        expect(label.trim().length, `${locale}.${item.labelKey}`).toBeGreaterThan(0);
      }
    }
  });
});
