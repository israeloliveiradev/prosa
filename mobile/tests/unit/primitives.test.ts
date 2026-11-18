import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const UI_DIR = resolve(process.cwd(), "src/ui");

test.describe("UI Primitives Unit & Static Contracts", () => {
  const uiFiles = readdirSync(UI_DIR).filter((f) => f.endsWith(".tsx"));

  test("all primitives are exported through src/ui/index.ts", () => {
    const indexPath = resolve(UI_DIR, "index.ts");
    const indexContent = readFileSync(indexPath, "utf8");

    for (const file of uiFiles) {
      const baseName = file.replace(/\.tsx$/, "");
      // index.ts should reference the file or primitive
      expect(indexContent).toContain(`./${baseName}`);
    }
  });

  test("zero hardcoded hex colors in UI primitive source files", () => {
    const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;

    for (const file of uiFiles) {
      // Flag primitive renders SVG flags where national flag colors are SVG standards
      if (file === "flag.tsx") continue;

      const filePath = resolve(UI_DIR, file);
      const content = readFileSync(filePath, "utf8");
      const matches = content.match(hexRegex);

      // No hardcoded hex values in styling logic
      expect(
        matches,
        `File ${file} contains hardcoded hex colors: ${matches?.join(", ")}`
      ).toBeNull();
    }
  });

  test("default testIDs in primitives follow kebab-case and ui-* prefix convention", () => {
    for (const file of uiFiles) {
      const filePath = resolve(UI_DIR, file);
      const content = readFileSync(filePath, "utf8");

      // Check default testID patterns like testID = "ui-..."
      const defaultTestIdMatches = content.matchAll(/testID\s*=\s*["']([^"']+)["']/g);
      for (const match of defaultTestIdMatches) {
        const testId = match[1];
        // Allow dynamic templates like `ui-flag-${code}` or standard `ui-...`
        if (!testId.includes("${")) {
          expect(testId).toMatch(/^ui-[a-z0-9-]+$/);
        }
      }
    }
  });

  test("accessibility roles are defined for interactive primitives", () => {
    const buttonSrc = readFileSync(resolve(UI_DIR, "button.tsx"), "utf8");
    expect(buttonSrc).toContain('accessibilityRole="button"');

    const switchSrc = readFileSync(resolve(UI_DIR, "switch.tsx"), "utf8");
    expect(switchSrc).toContain('accessibilityRole="switch"');

    const checkboxSrc = readFileSync(resolve(UI_DIR, "checkbox.tsx"), "utf8");
    expect(checkboxSrc).toContain('accessibilityRole="checkbox"');

    const progressSrc = readFileSync(resolve(UI_DIR, "progress.tsx"), "utf8");
    expect(progressSrc).toContain('accessibilityRole="progressbar"');

    const fieldSrc = readFileSync(resolve(UI_DIR, "field.tsx"), "utf8");
    expect(fieldSrc).toContain("aria-invalid={!!error}");

    const inlineErrorSrc = readFileSync(resolve(UI_DIR, "inline-error.tsx"), "utf8");
    expect(inlineErrorSrc).toContain('accessibilityRole="alert"');

    const dialogSrc = readFileSync(resolve(UI_DIR, "dialog.tsx"), "utf8");
    expect(dialogSrc).toContain("alertdialog");
  });
});
