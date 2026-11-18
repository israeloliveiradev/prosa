import { test, expect } from "../../fixtures";

test.describe("Onboarding - Quiz de Nivelamento e Interesses (/quiz)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("permite configurar idiomas, nível estimado e interesses", async ({ page }) => {
    await page.goto("/quiz");

    // Passo 0: Par de idiomas
    const pairPicker = page.getByTestId("onboarding-pair-picker");
    await expect(pairPicker).toBeVisible();

    const pairNextBtn = page.getByTestId("onboarding-pair-next");
    await expect(pairNextBtn).toBeVisible();
    await pairNextBtn.click();

    // Passo 1: Seleção de nível CEFR
    const levelStep = page.getByTestId("quiz-level-step");
    await expect(levelStep).toBeVisible();

    const levelB1 = page.getByTestId("quiz-level-B1");
    await expect(levelB1).toBeVisible();
    await levelB1.click();

    const levelNextBtn = page.getByTestId("quiz-level-next");
    await expect(levelNextBtn).toBeVisible();
    await levelNextBtn.click();

    // Passo 2: Seleção de temas de interesse
    const interestPicker = page.getByTestId("onboarding-interest-picker");
    await expect(interestPicker).toBeVisible();

    const themeChip = page.getByTestId("theme-Filosofia");
    await expect(themeChip).toBeVisible();
    await themeChip.click();

    const submitBtn = page.getByTestId("onboarding-interest-submit");
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Tela de tópicos gerados
    const finishBtn = page.getByTestId("quiz-finish-button");
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    await expect(page).toHaveURL(/\/daily/);
  });
});
