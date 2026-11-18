import { test, expect } from "../../fixtures";

test.describe("Course Switcher & Sheet (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("abre a folha de cursos ao clicar no botão de curso", async ({ page }) => {
    await page.goto("/");

    const courseBtn = page.getByTestId("course-switcher-btn");
    await expect(courseBtn).toBeVisible();

    await courseBtn.click();

    // Folha de cursos
    const sheet = page.getByTestId("course-sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByText("Seus idiomas")).toBeVisible();

    // Botão de adicionar curso
    const addBtn = page.getByTestId("course-add-btn");
    await expect(addBtn).toBeVisible();
  });
});
