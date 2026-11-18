import { test, expect } from "../../fixtures";

test.describe("Onboarding - Jornada Inicial (/start)", () => {
  test.use({ signedIn: true, persona: "firstDay" });

  test("navega pelos passos de boas-vindas, seleção de par e interesses", async ({ page }) => {
    await page.goto("/start");

    // Passo 0: Boas-vindas (se estiver no início)
    const beginBtn = page.getByTestId("onboarding-begin");
    if (await beginBtn.isVisible()) {
      await beginBtn.click();
    }

    // Passo 1: Seleção de par de idiomas
    const pairPicker = page.getByTestId("onboarding-pair-picker");
    await expect(pairPicker).toBeVisible();

    const targetOption = page.getByTestId("target-lang-en");
    await expect(targetOption).toBeVisible();
    await targetOption.click();

    const pairNextBtn = page.getByTestId("onboarding-pair-next");
    await expect(pairNextBtn).toBeVisible();
    await pairNextBtn.click();

    // Passo 2: Seleção de interesses
    const interestPicker = page.getByTestId("onboarding-interest-picker");
    await expect(interestPicker).toBeVisible();

    const themeChip = page.getByTestId("theme-Filosofia");
    await expect(themeChip).toBeVisible();
    await themeChip.click();

    const interestNextBtn = page.getByTestId("onboarding-interest-submit");
    await expect(interestNextBtn).toBeVisible();
    await interestNextBtn.click();

    // Passo 3: Nivelamento embutido
    const question = page.getByTestId("placement-question");
    await expect(question).toBeVisible();

    const optionBtn = page.getByTestId("placement-option-0");
    await expect(optionBtn).toBeVisible();
    await optionBtn.click();

    const forwardBtn = page.getByTestId("placement-submit-answer");
    await expect(forwardBtn).toBeVisible();
    await forwardBtn.click();

    // Tela de resultado do nivelamento
    const resultDoneBtn = page.getByTestId("placement-result-done");
    await expect(resultDoneBtn).toBeVisible();
    await resultDoneBtn.click();

    // Passo 4: Pronto para a primeira prosa
    const openProseBtn = page.getByTestId("onboarding-open-prose");
    await expect(openProseBtn).toBeVisible();
    await openProseBtn.click();

    // Redireciona para /daily
    await expect(page).toHaveURL(/\/daily/);
  });
});
