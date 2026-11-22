import { test, expect } from "../../fixtures";

test.describe("Autenticação - Login", () => {
  test("o formulário aparece com todos os campos necessários", async ({ page, mockApi }) => {
    await page.goto("/account");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("e-mail ou senha inválidos mostram mensagem de erro de validação", async ({ page, mockApi }) => {
    await page.goto("/account");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    // Preenche com formato inválido / senha curta
    await emailInput.fill("email-invalido");
    await passwordInput.fill("123");
    await submitBtn.click();

    // Validação local: erros por campo, sem chamar a API
    await expect(page.getByText("Digite um e-mail válido.")).toBeVisible();
    await expect(page.getByText("A senha precisa de 8 a 72 caracteres.")).toBeVisible();
    expect(mockApi.getCalls("POST", "/api/v1/auth/login").length).toBe(0);
  });

  test("credenciais incorretas (401) mostram erro traduzido", async ({ page, mockApi }) => {
    await page.goto("/account");

    mockApi.fail("POST", "/api/v1/auth/login", 401, "Invalid credentials");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    await emailInput.fill("usuario@prosa.test");
    await passwordInput.fill("senhaerrada123");
    await submitBtn.click();

    const errorBox = page.getByTestId("account-error");
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText("E-mail ou senha não conferem");
  });

  test("login com sucesso redireciona para a aplicação", async ({ page, mockApi }) => {
    await page.goto("/account");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    // Credencial configurada no mock de routes.mjs
    await emailInput.fill("learner@prosa.test");
    await passwordInput.fill("senha123");
    await submitBtn.click();

    // Deve redirecionar para '/' ou rota protegida
    await expect(page).not.toHaveURL(/\/account/);
  });
});
