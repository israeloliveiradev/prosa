import { test, expect } from "@playwright/test";
import { lightPalette, darkPalette } from "../../src/design/tokens";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe("WCAG 2.1 Contrast (Unit)", () => {
  test("light mode text on surfaces meets minimum 4.5:1", () => {
    const surfaces = [
      { name: "sheet", hex: lightPalette.sheet },
      { name: "frame", hex: lightPalette.frame },
      { name: "raised", hex: lightPalette.raised },
      { name: "active", hex: lightPalette.active },
    ];

    for (const surface of surfaces) {
      const crInk = contrastRatio(lightPalette.ink, surface.hex);
      const crMuted = contrastRatio(lightPalette.muted, surface.hex);
      const crFaint = contrastRatio(lightPalette.faint, surface.hex);

      expect(crInk, `ink on ${surface.name}`).toBeGreaterThanOrEqual(4.5);
      expect(crMuted, `muted on ${surface.name}`).toBeGreaterThanOrEqual(4.5);
      expect(crFaint, `faint on ${surface.name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("dark mode text on surfaces meets minimum 4.5:1", () => {
    const surfaces = [
      { name: "sheet", hex: darkPalette.sheet },
      { name: "frame", hex: darkPalette.frame },
      { name: "raised", hex: darkPalette.raised },
      { name: "active", hex: darkPalette.active },
    ];

    for (const surface of surfaces) {
      const crInk = contrastRatio(darkPalette.ink, surface.hex);
      const crMuted = contrastRatio(darkPalette.muted, surface.hex);
      const crFaint = contrastRatio(darkPalette.faint, surface.hex);

      expect(crInk, `ink on ${surface.name}`).toBeGreaterThanOrEqual(4.5);
      expect(crMuted, `muted on ${surface.name}`).toBeGreaterThanOrEqual(4.5);
      expect(crFaint, `faint on ${surface.name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("controlStrong borders meet WCAG 1.4.11 non-text 3.0:1 threshold", () => {
    // Light mode
    expect(contrastRatio(lightPalette.controlStrong, lightPalette.sheet)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(lightPalette.controlStrong, lightPalette.frame)).toBeGreaterThanOrEqual(3.0);

    // Dark mode
    expect(contrastRatio(darkPalette.controlStrong, darkPalette.sheet)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(darkPalette.controlStrong, darkPalette.frame)).toBeGreaterThanOrEqual(3.0);
  });

  test("primary button labels meet 4.5:1 contrast", () => {
    expect(contrastRatio(lightPalette.onPrimary, lightPalette.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.onPrimary, darkPalette.primary)).toBeGreaterThanOrEqual(4.5);
  });

  test("accent colors meet required contrast on surfaces", () => {
    // Accent on sheet
    expect(contrastRatio(lightPalette.accent, lightPalette.sheet)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.accent, darkPalette.sheet)).toBeGreaterThanOrEqual(4.5);

    // AccentInk on AccentSoft
    expect(contrastRatio(lightPalette.accentInk, lightPalette.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.accentInk, darkPalette.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });

  test("status colors meet minimum 4.5:1 on sheet", () => {
    // Light
    expect(contrastRatio(lightPalette.positive, lightPalette.sheet)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.negative, lightPalette.sheet)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.warning, lightPalette.sheet)).toBeGreaterThanOrEqual(4.5);

    // Dark
    expect(contrastRatio(darkPalette.positive, darkPalette.sheet)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.negative, darkPalette.sheet)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.warning, darkPalette.sheet)).toBeGreaterThanOrEqual(4.5);
  });

  test("status pill texts meet minimum 4.5:1 against pill backgrounds", () => {
    // Light pills
    expect(contrastRatio(lightPalette.pillPositiveInk, lightPalette.pillPositiveBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.pillNegativeInk, lightPalette.pillNegativeBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.pillWarningInk, lightPalette.pillWarningBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.pillNeutralInk, lightPalette.pillNeutralBg)).toBeGreaterThanOrEqual(4.5);

    // Dark pills
    expect(contrastRatio(darkPalette.pillPositiveInk, darkPalette.pillPositiveBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.pillNegativeInk, darkPalette.pillNegativeBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.pillWarningInk, darkPalette.pillWarningBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.pillNeutralInk, darkPalette.pillNeutralBg)).toBeGreaterThanOrEqual(4.5);
  });

  test("cast slot backgrounds support legible ink text (>= 4.5:1)", () => {
    // Light cast slots with light ink
    expect(contrastRatio(lightPalette.ink, lightPalette.castReading)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.ink, lightPalette.castMemory)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.ink, lightPalette.castSpeech)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightPalette.ink, lightPalette.castJournal)).toBeGreaterThanOrEqual(4.5);

    // Dark cast slots with dark ink
    expect(contrastRatio(darkPalette.ink, darkPalette.castReading)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.ink, darkPalette.castMemory)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.ink, darkPalette.castSpeech)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkPalette.ink, darkPalette.castJournal)).toBeGreaterThanOrEqual(4.5);
  });

  test("chart series colors meet non-text 3.0:1 against sheet", () => {
    expect(contrastRatio(lightPalette.chart1, lightPalette.sheet)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(lightPalette.chart2, lightPalette.sheet)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(lightPalette.chart3, lightPalette.sheet)).toBeGreaterThanOrEqual(3.0);

    expect(contrastRatio(darkPalette.chart1, darkPalette.sheet)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(darkPalette.chart2, darkPalette.sheet)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(darkPalette.chart3, darkPalette.sheet)).toBeGreaterThanOrEqual(3.0);
  });
});
