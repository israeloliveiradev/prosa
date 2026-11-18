import { test, expect } from "../../fixtures";

test.describe("Guide Screen (/guide) (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza a página de guia com formato editorial, régua e elenco", async ({ page }) => {
    await page.goto("/guide");

    const guideScreen = page.getByTestId("guide-screen");
    await expect(guideScreen).toBeVisible();

    // Título H1 sem kicker
    const title = page.getByTestId("guide-title");
    await expect(title).toBeVisible();
    await expect(title).toHaveText("Como usar o Prosa");

    // Conteúdo editorial
    await expect(page.getByText("O ritmo dos 20 minutos")).toBeVisible();
    await expect(page.getByText("As quatro mentes pedagógicas")).toBeVisible();
    await expect(page.getByText("Albert Einstein")).toBeVisible();
    await expect(page.getByText("Marie Curie")).toBeVisible();
    await expect(page.getByText("Richard Feynman")).toBeVisible();
    await expect(page.getByText("Leonardo da Vinci")).toBeVisible();
    await expect(page.getByText("Memória e retenção duradoura")).toBeVisible();

    // Ação "Rever as dicas de uso"
    const resetBtn = page.getByTestId("guide-reset-hints");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Feedback de redefinição
    await expect(page.getByText("Dicas redefinidas!")).toBeVisible();
  });
});
