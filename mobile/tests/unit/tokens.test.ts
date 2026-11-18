import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { lightPalette, darkPalette, palette, type, space, size, radius, border, motion, cast } from "../../src/design/tokens";

const OUT_DIR = resolve(process.cwd(), "src/design/generated");

test.describe("Design Tokens (Unit)", () => {
  test("lightPalette and darkPalette contain identical keys", () => {
    const lightKeys = Object.keys(lightPalette).sort();
    const darkKeys = Object.keys(darkPalette).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  test("palette export has light and dark matching lightPalette and darkPalette", () => {
    expect(palette.light).toBe(lightPalette);
    expect(palette.dark).toBe(darkPalette);
  });

  test("generated token files exist on disk", () => {
    expect(existsSync(resolve(OUT_DIR, "tokens.css"))).toBe(true);
    expect(existsSync(resolve(OUT_DIR, "tailwind-theme.cjs"))).toBe(true);
    expect(existsSync(resolve(OUT_DIR, "theme-vars.ts"))).toBe(true);
  });

  test("tokens.css includes CSS custom properties for surfaces, actions and legacy shims", () => {
    const cssPath = resolve(OUT_DIR, "tokens.css");
    const css = readFileSync(cssPath, "utf8");

    // Novas variáveis
    expect(css).toContain(`--sheet: ${lightPalette.sheet}`);
    expect(css).toContain(`--frame: ${lightPalette.frame}`);
    expect(css).toContain(`--accent: ${lightPalette.accent}`);
    expect(css).toContain(`--primary: ${lightPalette.primary}`);

    // Tema escuro
    expect(css).toContain(`--sheet: ${darkPalette.sheet}`);
    expect(css).toContain(`--frame: ${darkPalette.frame}`);
    expect(css).toContain(`--accent: ${darkPalette.accent}`);

    // Shims legados
    expect(css).toContain("--paper: var(--sheet)");
    expect(css).toContain("--card: var(--sheet)");
    expect(css).toContain("--sunken: var(--raised)");
    expect(css).toContain("--line: var(--border)");
    expect(css).toContain("--ember: var(--primary)");
    expect(css).toContain("--moss: var(--positive)");
  });

  test("typography tokens conform to 8-scale specification", () => {
    expect(type.display.size).toBe(28);
    expect(type.title.size).toBe(22);
    expect(type.section.size).toBe(16);
    expect(type.subsection.size).toBe(14);
    expect(type.body.size).toBe(14);
    expect(type.small.size).toBe(12);
    expect(type.kpi.size).toBe(24);
    expect(type.kpiLead.size).toBe(32);
    expect(type.reading.size).toBe(18);
  });

  test("space and size tokens adhere to 4px base and responsive layout rules", () => {
    expect(space.gutter.mobile).toBe(16);
    expect(space.gutter.desktop).toBe(24);
    expect(size.sidebar).toBe(228);
    expect(size.sheetInset).toBe(8);
    expect(size.content).toBe(1152);
  });

  test("radius and border adhere to flat rest surface principles", () => {
    expect(radius.chip).toBe(999);
    expect(radius.control).toBe(6);
    expect(radius.card).toBe(8);
    expect(radius.sheet).toBe(16);
    expect(border.width).toBe(1);
    expect(border.focusRing).toBe(2);
  });

  test("motion durations follow prompt gesture response rules", () => {
    expect(motion.press).toBe(120);
    expect(motion.quick).toBe(160);
    expect(motion.state).toBe(200);
    expect(motion.stage).toBe(240);
    expect(motion.celebrate).toBe(640);
  });

  test("cast slots have defined light and dark tones", () => {
    expect(cast.reading.light).toBe(lightPalette.castReading);
    expect(cast.reading.dark).toBe(darkPalette.castReading);
    expect(cast.memory.light).toBe(lightPalette.castMemory);
    expect(cast.speech.light).toBe(lightPalette.castSpeech);
    expect(cast.journal.light).toBe(lightPalette.castJournal);
  });
});
