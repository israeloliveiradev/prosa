import { test, expect } from "../../fixtures";

test.describe("Route Guard (E2E)", () => {
  test.describe("Unauthenticated (Sem sessão)", () => {
    test.use({ signedIn: false });

    test("tentar acessar / redireciona para /account", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/.*\/account/);
      await expect(page.getByTestId("account-email")).toBeVisible();
    });

    test("tentar acessar /practice ou /memory redireciona para /account", async ({ page }) => {
      await page.goto("/practice");
      await expect(page).toHaveURL(/.*\/account/);

      await page.goto("/memory");
      await expect(page).toHaveURL(/.*\/account/);
    });

    test("tentar acessar rota de foco /daily redireciona para /account", async ({ page }) => {
      await page.goto("/daily");
      await expect(page).toHaveURL(/.*\/account/);
    });

    test("a rota pública /account carrega sem redirecionamento", async ({ page }) => {
      await page.goto("/account");
      await expect(page).toHaveURL(/.*\/account/);
      await expect(page.getByTestId("account-email")).toBeVisible();
    });
  });

  test.describe("First Day Student (Com sessão, jornada pendente - D4)", () => {
    test.use({ signedIn: true, persona: "firstDay" });

    test("tentar acessar / redireciona para /start", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/.*\/start/);
    });

    test("tentar acessar /settings redireciona para /start (Decisão D4)", async ({ page }) => {
      await page.goto("/settings");
      await expect(page).toHaveURL(/.*\/start/);
    });

    test("rota de foco /start carrega normalmente", async ({ page }) => {
      await page.goto("/start");
      await expect(page).toHaveURL(/.*\/start/);
    });
  });

  test.describe("Authenticated Student (Com sessão e jornada concluída)", () => {
    test.use({ signedIn: true, persona: "learner" });

    test("tentar acessar /account redireciona para /", async ({ page }) => {
      await page.goto("/account");
      await expect(page).toHaveURL(/.*\//);
    });

    test("acesso livre às rotas da aplicação (app)", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/.*\//);

      await page.goto("/practice");
      await expect(page).toHaveURL(/.*\/practice/);
    });
  });
});
