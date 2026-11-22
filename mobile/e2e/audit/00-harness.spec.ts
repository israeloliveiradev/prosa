import { test, expect, createAccount, seedSession, assertLayout, api } from "./fixtures";

/** Sanidade da base da auditoria: conta real, sessão injetada, guarda e layout. */
test("a base abre Hoje com uma conta real e o guarda vê um 404 não declarado @harness", async ({ page, guard }) => {
  const session = await createAccount({ prefix: "harness", target: "en", level: "A1" });
  const me = await api(session.token, "GET", "/api/v1/account/settings");
  expect(me.status).toBe(200);

  await seedSession(page, session);
  await page.goto("/");
  await expect(page.getByTestId("nav-item-today").filter({ visible: true }).first()).toBeVisible();
  await assertLayout(page, "Hoje");

  // Um 404 de propósito: o guarda tem de registrar, e o allow() tem de silenciar.
  await page.evaluate((url) => fetch(url).catch(() => undefined), "http://127.0.0.1:3000/api/v1/rota-que-nao-existe");
  await expect.poll(() => guard.problems().some((line) => line.includes("rota-que-nao-existe"))).toBe(true);
  guard.allow(/rota-que-nao-existe/);
});
