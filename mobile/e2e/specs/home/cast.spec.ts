import { test, expect } from "../../fixtures";

test.describe("Home Screen - Pedagogical Cast (E2E)", () => {
  test.use({ signedIn: true, persona: "learner" });

  test("renderiza os 4 retratos do elenco pedagógico com links para configurações", async ({ page }) => {
    await page.goto("/");

    const castBlock = page.getByTestId("home-cast");
    await expect(castBlock).toBeVisible();

    // 4 mentes
    await expect(page.getByTestId("home-cast-item-einstein")).toBeVisible();
    await expect(page.getByTestId("home-cast-item-curie")).toBeVisible();
    await expect(page.getByTestId("home-cast-item-feynman")).toBeVisible();
    await expect(page.getByTestId("home-cast-item-davinci")).toBeVisible();

    // Link Personalizar navega para /settings
    const settingsLink = page.getByTestId("home-cast-settings");
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();

    await expect(page).toHaveURL(/.*\/settings/);
  });
});
