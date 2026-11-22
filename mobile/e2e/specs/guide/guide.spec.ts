import { test, expect } from "../../fixtures";

test.describe("Guide Screen (/guide) (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza a página de guia com formato editorial, régua e elenco", async ({ page }) => {
    await page.goto("/guide");

    const guideScreen = page.getByTestId("guide-screen");
    await expect(guideScreen).toBeVisible();

    // Título H1 sem kicker
    await expect(page.getByRole("heading", { name: "Como usar o Prosa" })).toBeVisible();
    await expect(page.getByTestId("guide-steps")).toBeVisible();

    // Conteúdo editorial
    await expect(page.getByText("O ritmo dos 20 minutos")).toBeVisible();
    await expect(page.getByText("As quatro mentes")).toBeVisible();
    await expect(page.getByText("Einstein").first()).toBeVisible();
    await expect(page.getByText("Curie").first()).toBeVisible();
    await expect(page.getByText("Feynman").first()).toBeVisible();
    await expect(page.getByText("Leonardo").first()).toBeVisible();
    await expect(page.getByText("Memória que dura")).toBeVisible();

    // Ação "Rever as dicas de uso"
    const resetBtn = page.getByTestId("guide-reset-hints");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Feedback de redefinição
    await expect(page.getByText("Dicas redefinidas!")).toBeVisible();
  });
});
