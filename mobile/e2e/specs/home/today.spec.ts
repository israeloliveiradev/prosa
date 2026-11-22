import { test, expect } from "../../fixtures";

test.describe("Home Screen - Today (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza o primeiro viewport da Home com saudação, sessão e blocos de apoio", async ({ page }) => {
    await page.goto("/");

    // Tela principal
    const homeScreen = page.getByTestId("home-screen");
    await expect(homeScreen).toBeVisible();

    // Saudação H1 (sem kicker)
    const greeting = page.getByTestId("home-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).not.toBeEmpty();

    // Sessão de hoje e plano
    await expect(page.getByTestId("home-session")).toBeVisible();
    await expect(page.getByTestId("home-start")).toBeVisible();

    // Blocos de apoio
    await expect(page.getByTestId("home-reviews")).toBeVisible();
    await expect(page.getByTestId("home-streak")).toBeVisible();
    await expect(page.getByTestId("home-xp")).toBeVisible();
  });

  test("botão de início navega para a sessão diária /daily", async ({ page }) => {
    await page.goto("/");

    const startBtn = page.getByTestId("home-start");
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page).toHaveURL(/.*\/daily/);
  });
});
