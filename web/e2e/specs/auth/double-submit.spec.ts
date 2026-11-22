import { test, expect } from "../../fixtures";

test.describe("Autenticação - Prevenção de Duplo Envio", () => {
  test("o botão de envio fica desabilitado durante a requisição impedindo chamadas duplicadas", async ({ page, mockApi }) => {
    let resolveLogin!: () => void;
    const loginGate = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });

    mockApi.override("POST", "/api/v1/auth/login", async (route) => {
      await loginGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-token-single",
          user: {
            id: "usr_single_1",
            email: "single@prosa.test",
            plan: "free",
            native_lang: "pt",
            target_lang: "en",
            level: "A2",
          },
        }),
      });
    });

    await page.goto("/account");

    const emailInput = page.getByTestId("account-email");
    const passwordInput = page.getByTestId("account-password");
    const submitBtn = page.getByTestId("account-submit").getByRole("button");

    await emailInput.fill("single@prosa.test");
    await passwordInput.fill("senhaValida123");

    // Primeiro clique
    await submitBtn.click();

    // Deve estar desabilitado enquanto pendente
    await expect(submitBtn).toBeDisabled();

    // Tenta clicar novamente enquanto desabilitado
    await submitBtn.click({ force: true }).catch(() => {});

    // Libera a requisição
    resolveLogin();

    // Redireciona com sucesso
    await expect(page).not.toHaveURL(/\/account/);

    // Garante que apenas 1 requisição de login foi enviada
    const loginCalls = mockApi.getCalls("POST", "/api/v1/auth/login");
    expect(loginCalls.length).toBe(1);
  });
});
