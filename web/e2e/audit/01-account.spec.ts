import { test, expect, assertLayout, assertLocalMailOnly, api, readStore, sql, APP } from "./fixtures";
import { press, tid, mailCode, userRow, sleep } from "./helpers-a";
import { ACCOUNT_COPY } from "@/lib/copy/account";

/** Bloco 1: cadastro pela UI, jornada de primeiro dia, persistência no servidor, F5, saída e novo login. */

async function answerPlacement(page: import("@playwright/test").Page): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    const question = tid(page, "placement-question");
    const done = tid(page, "placement-result-done");
    await expect(question.or(done)).toBeVisible({ timeout: 90_000 });
    if (await done.isVisible()) return;
    await tid(page, "placement-option-0").click();
    await press(page, "placement-submit-answer");
    await page.waitForTimeout(300);
  }
  throw new Error("o nivelamento não terminou em 40 perguntas");
}

test("cadastro, jornada /start, plano salvo no servidor, F5, sair e entrar de novo @mobile", async ({ page, guard, browser }) => {
  test.setTimeout(420_000);
  // O aquecimento da voz baixa o modelo da internet; falha de rede dele não é do bloco de conta.
  guard.allow(/huggingface|hf\.co|cdn\.jsdelivr|unpkg|cdnjs|onnx|wasm/i);

  const email = `audit-acc-${Date.now().toString(36)}@prosa.test`;
  const password = "senha12345";
  const copy = ACCOUNT_COPY.pt;

  await page.goto("/account");
  await expect(tid(page, "account-screen")).toBeVisible();
  await assertLayout(page, "/account");
  // O cadastro pela tela também manda e-mail: só com o Mailpit (ver fixtures.ts).
  assertLocalMailOnly();
  await press(page, "account-tab-signup");
  await tid(page, "account-email").fill(email);
  await tid(page, "account-password").fill(password);
  // Par de idiomas: alemão com apoio em português.
  await page.getByTestId("account-target-de").filter({ visible: true }).first().click();
  await page.getByTestId("account-support-pt").filter({ visible: true }).first().click();

  const since = Date.now() - 2000;
  // O cadastro tem limite de 8/min por IP (compartilhado com o outro agente): tenta de novo se vier o erro de excesso.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await press(page, "account-submit");
    const code = tid(page, "account-code");
    const err = tid(page, "account-error");
    await expect(code.or(err)).toBeVisible({ timeout: 30_000 });
    if (await code.isVisible()) break;
    await sleep(12_000);
  }
  guard.allow(/429 POST \/api\/v1\/auth\/register|Failed to load resource.*429/);
  await expect(tid(page, "account-code")).toBeVisible();

  const mailed = await mailCode(email, since);
  await tid(page, "account-code").fill(mailed);
  await press(page, "account-submit");

  // Onboarding /start
  await expect(page).toHaveURL(/\/start/, { timeout: 30_000 });
  // O cadastro já gravou o par escolhido na tela de conta.
  {
    const early = await api(null, "POST", "/api/v1/auth/login", { email, password });
    expect(early.json.user.target_lang, "par do cadastro (alvo)").toBe("de");
    expect(early.json.user.native_lang).toBe("pt");
  }
  await press(page, "onboarding-begin");
  await expect(tid(page, "onboarding-pair-picker")).toBeVisible();
  await assertLayout(page, "/start pair");
  // APP BUG (B1-1): a jornada abre com o par padrão (en/pt) e ignora o par escolhido no cadastro. O passo "par" tem de abrir com o par da conta.
  const opened = JSON.parse((await readStore(page, "prosa.journey.v1")) ?? "{}");
  expect.soft(opened.target_lang, "o passo par abre com o idioma escolhido no cadastro").toBe("de");
  // Segue o teste como o aluno faria: escolhe alemão de novo para cobrir o resto da jornada.
  await page.getByTestId("target-lang-de").filter({ visible: true }).first().click();
  await press(page, "onboarding-pair-next");

  await expect(tid(page, "onboarding-step-goal")).toBeVisible();
  await press(page, "goal-option-travel");
  await press(page, "onboarding-goal-next");

  await expect(tid(page, "onboarding-step-themes")).toBeVisible();
  await press(page, "theme-preset-1");
  await press(page, "theme-preset-2");
  await press(page, "onboarding-themes-next");

  await expect(tid(page, "onboarding-step-time")).toBeVisible();
  await press(page, "minutes-option-10");
  await press(page, "onboarding-time-next");

  await expect(tid(page, "onboarding-step-level")).toBeVisible();
  await press(page, "level-choice-start-test");
  await answerPlacement(page);
  await press(page, "placement-result-done");
  await expect(tid(page, "onboarding-ready")).toBeVisible({ timeout: 60_000 });
  await assertLayout(page, "/start plano");
  const planLevel = ((await tid(page, "onboarding-plan-level").textContent()) ?? "").trim();

  // Servidor: o que o app gravou.
  const login = await api(null, "POST", "/api/v1/auth/login", { email, password });
  expect(login.status).toBe(200);
  const userId = login.json.user.id as string;
  const row = userRow(userId);
  expect(row.goal).toBe("travel");
  expect(row.daily_minutes).toBe("10");
  expect(row.target_lang).toBe("de");
  expect(row.native_lang).toBe("pt");
  expect(row.interests.split(",").filter(Boolean)).toHaveLength(2);
  expect(row.level).toMatch(/^(A1|A2|B1|B2|C1|C2)$/);
  expect(planLevel).toContain(row.level);
  const settings = await api(login.json.token, "GET", "/api/v1/account/settings");
  expect(settings.json.goal).toBe("travel");
  expect(settings.json.daily_minutes).toBe(10);
  const placementRows = sql(`SELECT count(*) FROM placement_attempts WHERE user_id = '${userId}'`);
  expect(Number(placementRows[0])).toBeGreaterThanOrEqual(1);

  // Hoje (/): pelo fechar do plano.
  await press(page, "focus-shell-close");
  await expect(tid(page, "home-screen")).toBeVisible({ timeout: 30_000 });
  await assertLayout(page, "Hoje");

  // F5 mantém sessão e jornada.
  await page.reload();
  await expect(tid(page, "home-screen")).toBeVisible({ timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/account|\/start/);
  const journey = JSON.parse((await readStore(page, "prosa.journey.v1")) ?? "{}");
  expect(journey.done).toBe(true);
  expect(journey.userId).toBe(userId);
  expect(journey.minutes).toBe(10);
  const stored = JSON.parse((await readStore(page, "prosa.session.v1")) ?? "{}");
  expect(stored.user.email).toBe(email);

  // Sair (Ajustes) e entrar de novo.
  await page.goto("/settings");
  await expect(tid(page, "settings-screen")).toBeVisible();
  await press(page, "settings-sign-out");
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
  expect(await readStore(page, "prosa.session.v1")).toBeNull();
  const afterOut = await api(login.json.token, "GET", "/api/v1/account/settings");
  // O servidor invalida o token ao sair ou o app só o esquece; os dois são aceitáveis, mas o app não pode manter a sessão.
  expect([200, 401]).toContain(afterOut.status);

  // Senha errada: mensagem traduzida, sem texto cru da API.
  guard.allow(/401 POST \/api\/v1\/auth\/login|Failed to load resource.*401/);
  await tid(page, "account-email").fill(email);
  await tid(page, "account-password").fill("senha-errada-123");
  await press(page, "account-submit");
  const error = tid(page, "account-error");
  await expect(error).toBeVisible({ timeout: 20_000 });
  await expect(error).toHaveText(copy.invalidCredentials);
  await expect(error).not.toContainText(/Invalid credentials|error|401|undefined/i);
  await assertLayout(page, "/account erro");

  // Senha certa: volta direto a Hoje (jornada concluída no servidor), não ao /start.
  await tid(page, "account-password").fill(password);
  await press(page, "account-submit");
  await expect(page).toHaveURL(new RegExp(`^${APP.replace(/[.:/]/g, "\\$&")}/?(\\?.*)?$`), { timeout: 30_000 });
  await expect(tid(page, "home-screen")).toBeVisible({ timeout: 30_000 });
  const again = JSON.parse((await readStore(page, "prosa.journey.v1")) ?? "{}");
  expect(again.done).toBe(true);

  // Verificação independente: sair NÃO apaga "prosa.journey.v1" deste navegador (signOut só esquece a sessão),
  // então o "volta a Hoje" acima pode vir só do aparelho. Num aparelho novo (contexto limpo), a jornada concluída
  // e o plano (objetivo, minutos, temas, par) têm de vir do servidor.
  const device = await browser.newContext({ baseURL: APP, locale: "pt-BR", timezoneId: "America/Sao_Paulo", viewport: page.viewportSize() ?? { width: 1440, height: 900 } });
  const fresh = await device.newPage();
  const freshProblems: string[] = [];
  fresh.on("pageerror", (e) => freshProblems.push(`pageerror: ${String(e).slice(0, 200)}`));
  fresh.on("response", (r) => {
    if (r.status() >= 400 && !/huggingface|hf\.co|onnx|wasm/i.test(r.url())) freshProblems.push(`${r.status()} ${r.url()}`);
  });
  await fresh.goto("/account");
  await expect(tid(fresh, "account-screen")).toBeVisible();
  expect(await readStore(fresh, "prosa.journey.v1"), "aparelho novo começa sem jornada").toBeNull();
  await tid(fresh, "account-email").fill(email);
  await tid(fresh, "account-password").fill(password);
  await press(fresh, "account-submit");
  await expect(tid(fresh, "home-screen"), "aparelho novo: entra direto em Hoje").toBeVisible({ timeout: 30_000 });
  await expect(fresh).not.toHaveURL(/\/start|\/account/);
  const fromServer = JSON.parse((await readStore(fresh, "prosa.journey.v1")) ?? "{}");
  expect(fromServer.done, "jornada concluída vinda do servidor").toBe(true);
  expect(fromServer.userId).toBe(userId);
  expect(fromServer.goal, "objetivo vindo do servidor").toBe("travel");
  expect(fromServer.minutes, "minutos vindos do servidor").toBe(10);
  expect(fromServer.target_lang).toBe("de");
  expect((fromServer.interests ?? []).length, "temas vindos do servidor").toBe(2);
  expect(freshProblems, "erros no aparelho novo").toEqual([]);
  await device.close();
});
