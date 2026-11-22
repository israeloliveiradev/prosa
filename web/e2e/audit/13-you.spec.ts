import { GUIDE } from "@/lib/copy/guide";
import { ORG } from "@/lib/copy/org";
import { PAYWALL } from "@/lib/copy/paywall";
import { PROFILE } from "@/lib/copy/profile";
import { SETTINGS } from "@/lib/copy/settings";
import { test, expect, seedSession, assertLayout, api, sql, readStore } from "./fixtures";
import { AI_WAIT, accountOf, bodyText, createLearner, press, settingsOf, tid } from "./helpers-b";

const profile = PROFILE.pt;
const paywall = PAYWALL.pt;
const settings = SETTINGS.pt;

test.describe("Bloco 13 · Você, Ajustes e Assinatura", () => {
  test("editar temas e objetivo em Você grava na conta e as próximas telas usam os temas novos", async ({ page }) => {
    test.setTimeout(360_000);
    const session = await createLearner({ prefix: "you-themes", target: "en", level: "A2", interests: ["Música"], goal: "travel" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/profile");
    await expect(page.getByText(profile.themesTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Música", { exact: true }).first()).toBeVisible();
    await assertLayout(page, "Você");

    await page.getByRole("button", { name: profile.edit, exact: true }).filter({ visible: true }).first().click();
    await expect(tid(page, "quiz-screen")).toBeVisible({ timeout: 30_000 });
    // Temas: entra Cozinha e um tema livre; sai Música. Objetivo: carreira, com nota.
    await press(page, "theme-preset-6");
    await press(page, "theme-preset-8");
    await tid(page, "onboarding-theme-input").fill("astronomia");
    await press(page, "onboarding-theme-add");
    await press(page, "goal-option-career");
    await tid(page, "onboarding-goal-note").fill("entrevistas em inglês");
    await assertLayout(page, "Editar temas");
    await press(page, "quiz-save");
    await expect(page).toHaveURL(/\/profile$/, { timeout: AI_WAIT });

    // Efeito real: a conta no servidor guarda os temas e o objetivo novos.
    const account = await accountOf(session.token);
    expect(account.interests).toEqual(["Cozinha", "astronomia"]);
    expect(account.goal).toBe("career");
    expect(account.goal_note).toBe("entrevistas em inglês");
    expect(sql(`SELECT array_to_string(interests, ',') FROM users WHERE id='${session.user.id}'`)[0]).toBe("Cozinha,astronomia");

    // O script de semear a sessão roda a cada carga e devolveria a conta velha: semeia a conta de agora.
    await seedSession(page, { token: session.token, user: { ...session.user, ...account } }, { locale: "pt" });
    // Você mostra o que foi salvo (e depois de recarregar, vindo do servidor).
    await page.reload();
    await expect(page.getByText("astronomia", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Música", { exact: true })).toHaveCount(0);

    // Leitura: o primeiro tema da matéria é o novo e a lista traz o tema livre.
    const news = page.waitForRequest((request) => request.url().includes("/api/v1/news/fetch-adapted"), { timeout: AI_WAIT });
    await page.goto("/news");
    const sent = JSON.parse((await news).postData() ?? "{}");
    expect(sent.interest).toBe("Cozinha");
    await expect(page.getByRole("radio", { name: "astronomia" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Música", exact: true })).toHaveCount(1); // fica como tema canônico oferecido, não como escolhido
    await expect(page.getByRole("radio", { name: "Cozinha" })).toHaveCSS("background-color", "rgb(13, 148, 136)");

    // Cenas: o servidor monta as cenas do dia com o objetivo e o primeiro tema da conta nova.
    const scenes = await api(session.token, "GET", "/api/v1/persona/scenes?target_lang=en");
    expect(scenes.status).toBe(200);
    const text = JSON.stringify(scenes.json.scenes).toLowerCase();
    if (scenes.json.source === "ai") {
      // Contrato (docs/13-m3-contrato.md:116): "Cena `interest`: vem de `users.interests[0]`" — aqui Cozinha.
      // (Verificação independente: a versão anterior aceitava "um dos temas" e citava o contrato errado.)
      const interest = JSON.stringify(scenes.json.scenes.find((scene: { kind: string }) => scene.kind === "interest")).toLowerCase();
      expect(interest, "cena de interesse deve ser sobre interests[0] (Cozinha), como diz o contrato").toMatch(
        /cook|kitchen|recipe|food|restaurant|chef|culin|meal|dinner|cozinh|receita|comida/,
      );
      expect(text).not.toMatch(/\bguitar|concert|music|música|guitarra|show de/);
    } else {
      // Cenas fixas: o objetivo e o tema entram no texto.
      expect(text).toMatch(/cozinha|cooking|kitchen|food|cook/);
    }
    expect(scenes.json.scenes.map((scene: { kind: string }) => scene.kind)).toEqual(["goal", "unit", "interest"]);
  });

  test("Ajustes: minutos por dia, idioma e lembrete valem na conta e continuam depois de recarregar", async ({ page }) => {
    test.setTimeout(240_000);
    const session = await createLearner({ prefix: "you-settings", target: "en", level: "A2", minutes: 20 });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/settings");
    await expect(tid(page, "settings-screen")).toBeVisible();
    await assertLayout(page, "Ajustes");

    // Minutos por dia: 30.
    await press(page, "settings-minutes-30");
    await expect(page.getByText(settings.saved, { exact: true }).first()).toBeVisible();
    await expect.poll(async () => (await accountOf(session.token)).daily_minutes).toBe(30);
    await page.reload();
    await expect(tid(page, "settings-screen")).toBeVisible();
    await expect.poll(async () => JSON.parse((await readStore(page, "prosa.session.v1")) ?? "{}").user?.daily_minutes, { timeout: 20_000 }).toBe(30);

    // Lembrete por e-mail (o servidor tem SMTP no ambiente): ligar e mover a hora.
    const server = await settingsOf(session.token);
    if (server.mail_configured) {
      await press(page, "settings-reminder-toggle");
      await expect.poll(async () => (await settingsOf(session.token)).reminder_enabled).toBe(true);
      const hour = (await settingsOf(session.token)).reminder_hour as number;
      await press(page, "settings-hour-later");
      await expect.poll(async () => (await settingsOf(session.token)).reminder_hour).toBe((hour + 1) % 24);
      await page.reload();
      await expect(tid(page, "settings-reminder-hour")).toContainText(`${String(((hour + 1) % 24)).padStart(2, "0")}:00`, { timeout: 20_000 });
    } else {
      await expect(tid(page, "settings-reminders-unavailable")).toBeVisible();
    }

    // Idioma da interface: alemão vale no servidor e na tela depois de recarregar.
    await press(page, "settings-locale-de");
    await expect.poll(async () => (await accountOf(session.token)).display_locale).toBe("de");
    await page.reload();
    await expect(page.getByRole("heading", { name: SETTINGS.de.title })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(SETTINGS.de.kicker, { exact: true }).first()).toBeVisible();
    expect(SETTINGS.de.title).not.toBe(settings.title);
  });

  test("Ajustes: a velocidade da voz (natural x rápida) fica guardada depois de recarregar", async ({ page, guard }) => {
    test.setTimeout(240_000);
    const session = await createLearner({ prefix: "you-voice", target: "en", level: "A2" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/settings");
    await expect(tid(page, "voice-speed")).toBeVisible({ timeout: 30_000 });
    // Escolha explícita: voz natural (evita baixar o modelo da voz rápida neste teste).
    await press(page, "voice-speed-natural");
    await expect.poll(async () => JSON.parse((await readStore(page, "prosa.voice.speed.v1")) ?? "{}").preference).toBe("natural");
    await expect(tid(page, "voice-speed-natural")).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(tid(page, "voice-speed")).toBeVisible({ timeout: 30_000 });
    await expect(tid(page, "voice-speed-natural")).toHaveAttribute("aria-checked", "true");
    await expect(tid(page, "voice-speed-fast")).toHaveAttribute("aria-checked", "false");
    guard.allow(/huggingface|\.onnx|kokoro|piper/i);
  });

  test("a Assinatura é honesta: sem pagamento configurado ninguém vira Pro", async ({ page, guard }) => {
    const session = await createLearner({ prefix: "you-paywall", target: "en", level: "A2" });
    // Servidor sem Stripe: o status e o checkout dizem a verdade.
    const status = await api(session.token, "GET", "/api/v1/billing/status");
    expect(status.status).toBe(200);
    expect(status.json.checkout_available).toBe(false);
    const checkout = await api(session.token, "POST", "/api/v1/billing/checkout", { success_url: "http://127.0.0.1:8081/paywall?checkout=success", cancel_url: "http://127.0.0.1:8081/paywall?checkout=cancel" });
    expect(checkout.status).toBe(503);

    await seedSession(page, session, { locale: "pt" });
    await page.goto("/paywall");
    await expect(tid(page, "paywall-screen")).toBeVisible();
    await expect(tid(page, "paywall-plan-name")).toHaveText(paywall.planFree);
    await expect(tid(page, "paywall-unavailable")).toBeVisible({ timeout: 20_000 });
    await expect(tid(page, "paywall-unavailable")).toContainText(paywall.unavailableTitle);
    await expect(tid(page, "paywall-unavailable")).toContainText(paywall.unavailableBody);
    await expect(page.getByTestId("paywall-subscribe")).toHaveCount(0);
    await expect(page.getByTestId("paywall-pro")).toHaveCount(0);
    await assertLayout(page, "Assinatura");

    // Voltar do checkout "com sucesso" sem pagamento confirmado: nada muda, e a tela diz que não confirmou.
    guard.allow(/\/api\/v1\/billing\/sessions\//);
    await page.goto("/paywall?checkout=success&session_id=cs_test_naoexiste123");
    await expect(tid(page, "paywall-notice-notConfirmed")).toBeVisible({ timeout: 20_000 });
    await expect(tid(page, "paywall-plan-name")).toHaveText(paywall.planFree);
    expect(sql(`SELECT plan FROM users WHERE id='${session.user.id}'`)[0]).toBe("free");
    expect((await accountOf(session.token)).plan).toBe("free");
    // O plano não vazou como Pro no aparelho.
    expect(JSON.parse((await readStore(page, "prosa.session.v1")) ?? "{}").user?.plan).toBe("free");

    // Ajustes leva à Assinatura e mostra "gratuito".
    await page.goto("/settings");
    await press(page, "settings-open-paywall");
    await expect(tid(page, "paywall-screen")).toBeVisible();
  });

  test("a tela de Equipe e o Guia carregam sem erro", async ({ page }) => {
    const session = await createLearner({ prefix: "you-org", target: "en", level: "A2" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/org");
    await expect(page.getByRole("heading", { name: ORG.pt.title })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ORG.pt.create).first()).toBeVisible();
    await expect(page.getByText(ORG.pt.join).first()).toBeVisible();
    await assertLayout(page, "Equipe");

    await page.goto("/guide");
    await expect(tid(page, "guide-screen")).toBeVisible();
    await expect(page.getByRole("heading", { name: GUIDE.pt.title })).toBeVisible();
    await expect(tid(page, "guide-steps")).toBeVisible();
    // Os 6 passos numerados do ritmo, sem palavra quebrada no meio.
    const numbers = await tid(page, "guide-steps").locator("div").evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()).filter((text) => /^[1-6]$/.test(text)));
    expect([...new Set(numbers)]).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(await bodyText(page)).toContain(GUIDE.pt.memoryTitle);
    await assertLayout(page, "Guia");
  });

  test("Você e Ajustes cabem no celular @mobile", async ({ page }) => {
    const session = await createLearner({ prefix: "you-mobile", target: "en", level: "A2", interests: ["Música"], goal: "travel" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/profile");
    await expect(page.getByText(profile.themesTitle, { exact: true }).first()).toBeVisible();
    await assertLayout(page, "Você 390");
    await page.goto("/settings");
    await expect(tid(page, "settings-screen")).toBeVisible();
    await assertLayout(page, "Ajustes 390");
    await page.goto("/paywall");
    await expect(tid(page, "paywall-screen")).toBeVisible();
    await assertLayout(page, "Assinatura 390");
  });
});
