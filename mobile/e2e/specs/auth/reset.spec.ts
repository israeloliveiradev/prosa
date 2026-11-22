import { test, expect } from "../../fixtures";

test.describe("Autenticação - Recuperação e Redefinição de Senha", () => {
  test("esqueci a senha envia o código e abre o passo de nova senha", async ({ page, mockApi }) => {
    await page.goto("/account");
    await page.getByTestId("account-forgot").click();

    await page.getByTestId("account-email").fill("recuperar@prosa.test");
    await page.getByTestId("account-submit").click();

    await expect(page.getByTestId("account-code")).toBeVisible();
    await expect(page.getByTestId("account-new-password")).toBeVisible();
    expect(mockApi.getCalls("POST", "/api/v1/auth/forgot").length).toBe(1);
  });

  test("link antigo /reset cai na conta já no passo de recuperação, com e-mail", async ({ page }) => {
    await page.goto("/reset?email=aluno@prosa.test");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByTestId("account-email")).toHaveValue("aluno@prosa.test");
  });

  test("redefinição com código válido volta ao login com aviso", async ({ page }) => {
    await page.goto("/account?mode=forgot");
    await page.getByTestId("account-email").fill("aluno@prosa.test");
    await page.getByTestId("account-submit").click();

    await page.getByTestId("account-code").fill("123456");
    await page.getByTestId("account-new-password").fill("novaSenhaSuperForte123!");
    await page.getByTestId("account-submit").click();

    await expect(page.getByTestId("account-notice")).toContainText("Senha nova salva");
    await expect(page.getByTestId("account-password")).toBeVisible();
  });

  test("código de redefinição expirado exibe mensagem de erro traduzida", async ({ page }) => {
    await page.goto("/account?mode=forgot");
    await page.getByTestId("account-email").fill("aluno@prosa.test");
    await page.getByTestId("account-submit").click();

    await page.getByTestId("account-code").fill("999999");
    await page.getByTestId("account-new-password").fill("novaSenhaSuperForte123!");
    await page.getByTestId("account-submit").click();

    await expect(page.getByTestId("account-error")).toContainText("O código de redefinição expirou");
  });
});
