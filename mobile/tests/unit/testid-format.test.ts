import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const SRC_DIR = resolve(process.cwd(), "src");

function walk(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

test.describe("testID Naming Convention Unit Tests", () => {
  const files = walk(SRC_DIR);
  // Pattern from Section 13.4 of 11-plano-de-refatoracao.md:
  // Kebab-case with at least two lowercase/number segments separated by hyphens
  const testIdFormat = /^[a-z]+(-[a-z0-9]+)+$/;

  test("all literal testIDs in src match kebab-case convention (/^[a-z]+(-[a-z0-9]+)+$/)", () => {
    const invalidTestIds: { file: string; testId: string }[] = [];
    const foundTestIds: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const relPath = relative(process.cwd(), file).replace(/\\/g, "/");

      // Match testID="something" or testID={'something'}
      const matches = content.matchAll(/\btestID=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/g);
      for (const match of matches) {
        const id = match[1] || match[2];
        if (!id) continue;

        // Skip template strings or variable expressions
        if (id.includes("${") || id.startsWith("{")) continue;

        foundTestIds.push(id);
        if (!testIdFormat.test(id)) {
          invalidTestIds.push({ file: relPath, testId: id });
        }
      }
    }

    expect(
      foundTestIds.length,
      "Expected to find literal testIDs across src codebase"
    ).toBeGreaterThan(0);

    expect(
      invalidTestIds,
      `Found testIDs that violate kebab-case convention (/^[a-z]+(-[a-z0-9]+)+$/): ${JSON.stringify(invalidTestIds, null, 2)}`
    ).toEqual([]);
  });

  test("primitives derived testIDs follow standard suffix pattern (-label, -error, -hint, -close)", () => {
    const fieldSrc = readFileSync(resolve(SRC_DIR, "ui/field.tsx"), "utf8");
    expect(fieldSrc).toContain("${testID}-label");
    expect(fieldSrc).toContain("${testID}-error");
    expect(fieldSrc).toContain("${testID}-hint");

    const sheetSrc = readFileSync(resolve(SRC_DIR, "ui/sheet.tsx"), "utf8");
    expect(sheetSrc).toContain("${testID}-close");
  });
});
