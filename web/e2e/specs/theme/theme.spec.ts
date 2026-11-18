import { test, expect } from "../../fixtures";

test.describe("Theme System (E2E)", () => {
  test("light theme sets class 'light' and light color-scheme on html element", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("prosa\\prosa.theme.v2", "light");
    });
    await page.goto("/account");
    await page.waitForLoadState("domcontentloaded");

    const html = page.locator("html");
    await expect(html).toHaveClass(/light/);
    await expect(html).not.toHaveClass(/dark/);

    const colorScheme = await html.evaluate((el) => el.style.colorScheme);
    expect(colorScheme).toBe("light");
  });

  test("dark theme sets class 'dark' and dark color-scheme on html element", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("prosa\\prosa.theme.v2", "dark");
    });
    await page.goto("/account");
    await page.waitForLoadState("domcontentloaded");

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    await expect(html).not.toHaveClass(/light/);

    const colorScheme = await html.evaluate((el) => el.style.colorScheme);
    expect(colorScheme).toBe("dark");
  });

  test("system theme follows OS color scheme dynamically", async ({ page }) => {
    // Start with light OS scheme
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      localStorage.setItem("prosa\\prosa.theme.v2", "system");
    });
    await page.goto("/account");
    await page.waitForLoadState("domcontentloaded");

    const html = page.locator("html");
    await expect(html).toHaveClass(/light/);

    // Switch OS to dark scheme
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveClass(/dark/);
    await expect(html).not.toHaveClass(/light/);

    // Switch back to light
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).toHaveClass(/light/);
    await expect(html).not.toHaveClass(/dark/);
  });

  test("theme preference persists in localStorage across page reload", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("prosa\\prosa.theme.v2", "dark");
    });
    await page.goto("/account");
    await page.waitForLoadState("domcontentloaded");

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    // Reload page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(html).toHaveClass(/dark/);

    const stored = await page.evaluate(() => localStorage.getItem("prosa\\prosa.theme.v2"));
    expect(stored).toBe("dark");
  });

  test("anti-flash script applies dark class before bundle paint when dark is stored", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("prosa\\prosa.theme.v2", "dark");
    });

    // Check immediate class on initial HTML load
    await page.goto("/account", { waitUntil: "commit" });
    const hasDarkImmediately = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(hasDarkImmediately).toBe(true);
  });
});
