import { test, expect } from "../../fixtures";

test.describe("Home Screen - Free vs Pro Topic Customization (E2E)", () => {
  test.describe("Free Learner", () => {
    test.use({ signedIn: true, persona: "learner" });

    test("redireciona para o paywall ao tentar personalizar o tópico", async ({ page }) => {
      await page.goto("/");

      const topicToggle = page.getByTestId("home-topic-toggle");
      await expect(topicToggle).toBeVisible();
      await expect(topicToggle).toContainText("Pro");

      await topicToggle.click();
      await expect(page).toHaveURL(/.*\/paywall/);
    });
  });

  test.describe("Pro User", () => {
    test.use({ signedIn: true, persona: "pro" });

    test("abre o editor de tópico e permite digitar tema personalizado", async ({ page }) => {
      await page.goto("/");

      const topicToggle = page.getByTestId("home-topic-toggle");
      await expect(topicToggle).toBeVisible();

      await topicToggle.click();

      const input = page.getByTestId("home-topic-input");
      await expect(input).toBeVisible();
      await input.fill("Cafeteria em Kyoto");

      // O título do tópico se atualiza dinamicamente
      const topicTitle = page.getByTestId("home-topic-title");
      await expect(topicTitle).toHaveText("Cafeteria em Kyoto");
    });
  });
});
