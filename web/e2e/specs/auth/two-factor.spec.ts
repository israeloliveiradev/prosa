import { test, expect } from "../../fixtures";

test.describe("Autenticação - Segundo Fator (2FA)", () => {
  test("desafio de 2FA exibe campo OTP e conclui autenticação com código válido", async ({ page, mockApi }) => {
    // Configura o login para exigir 2FA
    mockApi.override("POST", "/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requires_2fa: true,
          ticket: "mock-ticket-2fa",
          methods: ["totp"],
        }),
      });
    });

    await page.goto("/account");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit");

    await emailInput.fill("seguro@prosa.test");
    await passwordInput.fill("senhaValida123");
    await submitBtn.click();

    // Deve estar no modo 2FA com campo OTP visível
    const otpInput = page.getByTestId("account-otp-input");
    await expect(otpInput).toBeAttached();

    // Digita o código de 6 dígitos
    await otpInput.fill("123456");

    // Submete o segundo fator
    const confirmBtn = page.getByTestId("account-submit");
    await confirmBtn.click();

    // Deve redirecionar após validação bem-sucedida do 2FA
    await expect(page).not.toHaveURL(/\/account/);
  });

  test("código 2FA incorreto exibe erro traduzido", async ({ page, mockApi }) => {
    mockApi.override("POST", "/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requires_2fa: true,
          ticket: "mock-ticket-2fa",
          methods: ["totp"],
        }),
      });
    });

    await page.goto("/account");

    await page.getByTestId("account-email").fill("seguro@prosa.test");
    await page.getByTestId("account-password").fill("senhaValida123");
    await page.getByTestId("account-submit").click();

    const otpInput = page.getByTestId("account-otp-input");
    await expect(otpInput).toBeAttached();

    // Digita código inválido
    await otpInput.fill("999999");
    await page.getByTestId("account-submit").click();

    const errorBox = page.getByTestId("account-error");
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText("E-mail ou senha não confere");
  });
});
