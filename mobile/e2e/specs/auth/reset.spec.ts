import { test, expect } from "../../fixtures";

test.describe("Autenticação - Recuperação e Redefinição de Senha", () => {
  test("solicitar recuperação na tela de login navega para /reset com e-mail preenchido", async ({ page }) => {
    await page.goto("/account");

    const forgotBtn = page.getByTestId("account-forgot");
    await expect(forgotBtn).toBeVisible();
    await forgotBtn.click();

    // Modo forgot
    const emailInput = page.getByTestId("account-email");
    await emailInput.fill("recuperar@prosa.test");

    const submitBtn = page.getByTestId("account-submit");
    await submitBtn.click();

    // Deve navegar para a rota /reset com o query param do email
    await expect(page).toHaveURL(/\/reset/);

    const resetEmail = page.getByTestId("reset-email");
    await expect(resetEmail).toHaveValue("recuperar@prosa.test");
  });

  test("redefinição de senha com código válido redireciona para /account", async ({ page }) => {
    await page.goto("/reset?email=aluno@prosa.test");

    const otpInput = page.getByTestId("reset-otp-input");
    const passwordInput = page.getByTestId("reset-password");
    const submitBtn = page.getByTestId("reset-submit");

    await expect(otpInput).toBeAttached();
    await otpInput.fill("123456");
    await passwordInput.fill("novaSenhaSuperForte123!");

    await submitBtn.click();

    // Deve redirecionar para a tela de login
    await expect(page).toHaveURL(/\/account/);
  });

  test("código de redefinição expirado exibe mensagem de erro traduzida", async ({ page }) => {
    await page.goto("/reset?email=aluno@prosa.test");

    const otpInput = page.getByTestId("reset-otp-input");
    const passwordInput = page.getByTestId("reset-password");
    const submitBtn = page.getByTestId("reset-submit");

    await expect(otpInput).toBeAttached();
    await otpInput.fill("999999");
    await passwordInput.fill("novaSenhaSuperForte123!");

    await submitBtn.click();

    const errorBox = page.getByTestId("reset-error");
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText("O código expirou ou não confere");
  });
});
