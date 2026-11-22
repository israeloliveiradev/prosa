import { test, expect } from "../../fixtures";

test.describe("Deep Linking & Public Routes (E2E)", () => {
  test.use({ signedIn: false });

  test("deep link direto para a rota pública /account renderiza o formulário", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/.*\/account/);
    await expect(page.getByTestId("account-email")).toBeVisible();
  });

  test("a galeria /dev/ui só existe em desenvolvimento: no build ela não aparece", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(page.getByText("Galeria de Primitivos UI")).toHaveCount(0);
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
