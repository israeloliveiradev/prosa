import { test, expect } from "../../fixtures";

test.describe("AppShell Structure & Navigation (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza o shell no desktop com sidebar e navega entre destinos", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teste exclusivo para desktop (>= 1024px)");

    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("sidebar-open-daily")).toBeVisible();

    // Cinco destinos primários na sidebar
    for (const id of ["today", "path", "reading", "talk", "you"]) {
      await expect(page.getByTestId(`nav-item-${id}`)).toBeVisible();
    }

    await page.getByTestId("nav-item-path").click();
    await expect(page).toHaveURL(/.*\/path/);

    await page.getByTestId("nav-item-reading").click();
    await expect(page).toHaveURL(/.*\/news/);
  });

  test("renderiza a barra de abas no celular (< 1024px) e navega", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Teste exclusivo para celular (< 1024px)");

    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible();

    for (const id of ["today", "path", "reading", "talk", "you"]) {
      await expect(page.getByTestId(`tab-${id}`)).toBeVisible();
    }

    await page.getByTestId("tab-path").click();
    await expect(page).toHaveURL(/.*\/path/);

    await page.getByTestId("tab-talk").click();
    await expect(page).toHaveURL(/.*\/talk/);
  });
});
