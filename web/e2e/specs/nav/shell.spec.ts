import { test, expect } from "../../fixtures";

test.describe("AppShell Structure & Navigation (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza o shell no desktop com sidebar e navega entre destinos", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teste exclusivo para desktop (>= 1024px)");

    await page.goto("/");
    const shell = page.getByTestId("app-shell");
    await expect(shell).toBeVisible();

    // Botão de ação em destaque
    const dailyBtn = page.getByTestId("sidebar-open-daily");
    await expect(dailyBtn).toBeVisible();

    // Destinos primários na sidebar
    const practiceNav = page.getByTestId("nav-item-practice");
    await expect(practiceNav).toBeVisible();
    await practiceNav.click();
    await expect(page).toHaveURL(/.*\/practice/);

    const memoryNav = page.getByTestId("nav-item-memory");
    await expect(memoryNav).toBeVisible();
    await memoryNav.click();
    await expect(page).toHaveURL(/.*\/memory/);
  });

  test("renderiza a barra de abas no celular (< 1024px) e navega", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Teste exclusivo para celular (< 1024px)");

    await page.goto("/");
    const shell = page.getByTestId("app-shell");
    await expect(shell).toBeVisible();

    // Abas inferiores
    const tabPractice = page.getByTestId("tab-practice");
    const tabMemory = page.getByTestId("tab-memory");
    const tabNews = page.getByTestId("tab-news");
    const tabProfile = page.getByTestId("tab-profile");

    await expect(tabPractice).toBeVisible();
    await expect(tabMemory).toBeVisible();
    await expect(tabNews).toBeVisible();
    await expect(tabProfile).toBeVisible();

    // Navegação via aba
    await tabPractice.click();
    await expect(page).toHaveURL(/.*\/practice/);

    await tabMemory.click();
    await expect(page).toHaveURL(/.*\/memory/);
  });
});
