import { test, expect } from "../../fixtures";

test.describe("Plano de estudo (/quiz, aberto a partir de Você)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("carrega a conta, mostra as seções do plano e salva uma mudança de tema", async ({ page, mockApi }) => {
    await page.goto("/quiz");

    await expect(page.getByTestId("quiz-screen")).toBeVisible();
    await expect(page.getByTestId("quiz-section-course")).toBeVisible();
    await expect(page.getByTestId("quiz-section-goal")).toBeVisible();
    await expect(page.getByTestId("quiz-section-themes")).toBeVisible();
    await expect(page.getByTestId("quiz-section-time")).toBeVisible();
    await expect(page.getByTestId("quiz-level")).toBeVisible();

    await page.getByTestId("theme-preset-1").click();
    await page.getByTestId("quiz-save").getByRole("button").click();

    await expect(page).toHaveURL(/\/profile/);
    expect(mockApi.getCalls("POST", "/api/v1/onboarding/quiz").length).toBe(1);
  });
});
