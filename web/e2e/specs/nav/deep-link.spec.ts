import { test, expect } from "../../fixtures";

test.describe("Deep Linking & Public Routes (E2E)", () => {
  test.use({ signedIn: false });

  test("deep link direto para rota pública /dev/ui renderiza corretamente", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(page).toHaveURL(/.*\/dev\/ui/);
    await expect(page.getByText("Galeria de Primitivos UI")).toBeVisible();
  });

  test("deep link para rota dinâmica /cert/[token] carrega sem erro 404", async ({ page }) => {
    await page.goto("/cert/demo-token-123");
    await expect(page).toHaveURL(/.*\/cert\/demo-token-123/);
  });

  test("deep link para rota dinâmica /dossier/[token] carrega sem erro 404", async ({ page }) => {
    await page.goto("/dossier/demo-token-456");
    await expect(page).toHaveURL(/.*\/dossier\/demo-token-456/);
  });
});
