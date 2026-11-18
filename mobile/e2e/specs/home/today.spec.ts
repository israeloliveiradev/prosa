import { test, expect } from "../../fixtures";

test.describe("Home Screen - Today & SessionRuler (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza o primeiro viewport da Home com saudação, régua e blocos de suporte", async ({ page }) => {
    await page.goto("/");

    // Tela principal
    const homeScreen = page.getByTestId("home-screen");
    await expect(homeScreen).toBeVisible();

    // Saudação H1 (sem kicker)
    const greeting = page.getByTestId("home-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).toContainText(/Olá|Faltam|Prosa de hoje/);

    // Bloco herói de hoje
    const todayBlock = page.getByTestId("home-today");
    await expect(todayBlock).toBeVisible();

    // Régua de 20 minutos com segmentos
    const sessionRuler = page.getByTestId("home-session-ruler");
    await expect(sessionRuler).toBeVisible();

    // 3 Blocos de suporte
    await expect(page.getByTestId("home-reviews")).toBeVisible();
    await expect(page.getByTestId("home-streak")).toBeVisible();
    await expect(page.getByTestId("home-placement")).toBeVisible();

    // Bloco do elenco pedagógico
    await expect(page.getByTestId("home-cast")).toBeVisible();
  });

  test("permite dispensar a dica de área contextual", async ({ page }) => {
    await page.goto("/");

    const hint = page.getByTestId("home-area-hint");
    if (await hint.isVisible()) {
      const dismissBtn = page.getByTestId("home-area-hint-dismiss");
      await dismissBtn.click();
      await expect(hint).not.toBeVisible();
    }
  });

  test("botão de início navega para a sessão diária /daily", async ({ page }) => {
    await page.goto("/");

    const startBtn = page.getByTestId("home-start");
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page).toHaveURL(/.*\/daily/);
  });
});
