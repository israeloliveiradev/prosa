import { test, expect } from "../../fixtures";

test.describe("Nivelamento - Teste Adaptativo (/placement)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("inicia o teste, responde à questão e visualiza resultado com barras de habilidades", async ({ page }) => {
    await page.goto("/placement");

    // Tela inicial do teste de nivelamento
    const startBtn = page.getByTestId("placement-start-button");
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Questão
    const question = page.getByTestId("placement-question");
    await expect(question).toBeVisible();

    const optionBtn = page.getByTestId("placement-option-0");
    await expect(optionBtn).toBeVisible();
    await optionBtn.click();

    const forwardBtn = page.getByTestId("placement-submit-answer");
    await expect(forwardBtn).toBeVisible();
    await forwardBtn.click();

    // Resultado do teste
    const result = page.getByTestId("placement-result");
    await expect(result).toBeVisible();

    const resultLevel = page.getByTestId("placement-result-level");
    await expect(resultLevel).toBeVisible();
    await expect(resultLevel).toHaveText("B1");

    // Barras de habilidades
    const skillBars = page.getByTestId("placement-skill-bars");
    await expect(skillBars).toBeVisible();

    // Checklist Can-Do
    const canDoItem = page.getByTestId("placement-can-do-item-b1-read");
    if (await canDoItem.isVisible()) {
      await canDoItem.click();
      const saveCanDoBtn = page.getByTestId("placement-save-can-do");
      await expect(saveCanDoBtn).toBeVisible();
      await saveCanDoBtn.click();
    }

    // Botão de conclusão
    const doneBtn = page.getByTestId("placement-result-done");
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();

    await expect(page).toHaveURL("/");
  });
});
