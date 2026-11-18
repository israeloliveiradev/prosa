import { test, expect } from "../../fixtures";

test.describe("Not Found 404 Route (E2E)", () => {
  test.use({ signedIn: false });

  test("rota inexistente exibe a tela +not-found e permite voltar", async ({ page }) => {
    await page.goto("/rota-desconhecida-xyz");

    const title = page.getByText("Página não encontrada");
    await expect(title).toBeVisible();

    const backBtn = page.getByTestId("not-found-back-home");
    await expect(backBtn).toBeVisible();

    await backBtn.click();
    // Como está sem sessão, voltar ao início levará a /account
    await expect(page).toHaveURL(/.*\/account/);
  });
});
