import { test, expect } from "@playwright/test";
import { resolveThemeMigration } from "../../src/theme/migration";

test.describe("Theme Preference Migration (Unit)", () => {
  test("migrates v1 'dark' to v2 'dark' with persist flag", () => {
    const result = resolveThemeMigration(undefined, "dark");
    expect(result.preference).toBe("dark");
    expect(result.nextV2).toBe("dark");
  });

  test("migrates v1 'light' to v2 'system' with persist flag (Decision D3)", () => {
    const result = resolveThemeMigration(undefined, "light");
    expect(result.preference).toBe("system");
    expect(result.nextV2).toBe("system");
  });

  test("migrates absent v1/v2 to v2 'system' default with persist flag", () => {
    const result = resolveThemeMigration(undefined, undefined);
    expect(result.preference).toBe("system");
    expect(result.nextV2).toBe("system");
  });

  test("migrates invalid v1 value to v2 'system'", () => {
    const result = resolveThemeMigration(undefined, "invalid-theme");
    expect(result.preference).toBe("system");
    expect(result.nextV2).toBe("system");
  });

  test("preserves existing v2 preferences without re-persisting", () => {
    expect(resolveThemeMigration("dark", "light")).toEqual({
      preference: "dark",
      nextV2: null,
    });
    expect(resolveThemeMigration("light", "dark")).toEqual({
      preference: "light",
      nextV2: null,
    });
    expect(resolveThemeMigration("system", "dark")).toEqual({
      preference: "system",
      nextV2: null,
    });
  });
});
