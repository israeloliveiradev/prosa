import { test, expect } from "../../fixtures";

test.describe("Autenticação - Cadastro", () => {
  test("alterna para o modo de cadastro e exibe campos e seletor de nível", async ({ page }) => {
    await page.goto("/account");

    const toggleBtn = page.getByTestId("account-toggle-mode");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Campos de cadastro
    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const levelSelector = page.getByTestId("account-level");
    const submitBtn = page.getByTestId("account-submit");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(levelSelector).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("indicador de força de senha reage à digitação", async ({ page }) => {
    await page.goto("/account?criar=1");

    const passwordInput = page.getByTestId("account-password");
    await passwordInput.fill("12345678");

    // Verifica que mensagem de força aparece
    const strengthText = page.locator("text=Senha");
    await expect(strengthText.first()).toBeVisible();
  });

  test("cadastro com sucesso redireciona para a aplicação", async ({ page }) => {
    await page.goto("/account?criar=1");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    await emailInput.fill("novoaluno@prosa.test");
    await passwordInput.fill("senhaForte123!");
    await submitBtn.click();

    await expect(page).not.toHaveURL(/\/account/);
  });

  test("e-mail já cadastrado mostra erro 409 traduzido", async ({ page, mockApi }) => {
    await page.goto("/account?criar=1");

    mockApi.fail("POST", "/api/v1/auth/register", 409, "Email already registered");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    await emailInput.fill("existente@prosa.test");
    await passwordInput.fill("senhaValida123");
    await submitBtn.click();

    const errorBox = page.getByTestId("account-error");
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText("Este e-mail já tem uma conta");
  });
});
