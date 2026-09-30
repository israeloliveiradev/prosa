#!/usr/bin/env node
/**
 * Prosa QA smoke: API contracts, CORS, auth+Mailpit, guest lesson, Expo routes.
 * Usage: node .cursor/skills/prosa-qa/scripts/smoke.mjs
 * Never prints passwords or API keys.
 */
const API = process.env.PROSA_API_URL ?? "http://127.0.0.1:3000";
const APP = process.env.PROSA_APP_URL ?? "http://127.0.0.1:8081";
const MAIL = process.env.PROSA_MAILPIT_URL ?? "http://127.0.0.1:8025";

const findings = [];
let passed = 0;
let failed = 0;

function record(ok, id, detail) {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${id}  ${detail}`);
    return;
  }
  failed += 1;
  findings.push({ id, detail });
  console.log(`FAIL  ${id}  ${detail}`);
}

async function req(url, init = {}) {
  const response = await fetch(url, { ...init, redirect: "manual" });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { status: response.status, headers: response.headers, body };
}

async function main() {
  const health = await req(`${API}/health`);
  record(health.status === 200 && health.body?.status === "ok", "api.health", `status=${health.status} schema=${health.body?.schema ?? "?"}`);

  const me = await req(`${API}/api/v1/auth/me`);
  record(me.status === 401, "api.me.anon", `status=${me.status}`);

  const billed = await req(`${API}/api/v1/billing/sessions/cs_test_unauthorized`);
  record(billed.status === 401, "api.billing.session.anon", `status=${billed.status}`);

  const empty = await req(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  record(empty.status === 400, "api.register.empty", `status=${empty.status}`);

  const cors = await req(`${API}/api/v1/auth/logout`, {
    method: "POST",
    headers: { origin: "https://evil.example", "content-type": "application/json" },
  });
  record(cors.status === 403, "api.cors.evil-origin", `status=${cors.status} body=${JSON.stringify(cors.body)}`);

  const login = await req(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "nobody@local.test", password: "wrongpass" }),
  });
  record(login.status === 401 && login.body?.error === "Invalid credentials", "api.login.bad", `status=${login.status}`);

  const voices = await req(`${API}/api/v1/audio/voices?lang=en`);
  record(voices.status === 200 && Array.isArray(voices.body?.voices), "api.voices.en", `status=${voices.status} n=${voices.body?.voices?.length ?? 0}`);

  const lesson = await req(`${API}/api/v1/lessons/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target_lang: "en", native_lang: "pt", level: "A2" }),
  });
  const lessonOk = lesson.status === 200 && typeof lesson.body?.story_text === "string";
  record(lessonOk, "api.lesson.guest", `status=${lesson.status} keys=${lesson.body && typeof lesson.body === "object" ? Object.keys(lesson.body).join(",") : typeof lesson.body}`);

  const stamp = Date.now();
  const email = `qa.${stamp}@local.test`;
  const password = `Qa${stamp}!x`;
  const created = await req(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, native_lang: "pt", target_lang: "en", level: "A2" }),
  });
  record(created.status === 201 && created.body?.requires_verify === true, "api.register.verify-gate", `status=${created.status} verify=${created.body?.requires_verify === true}`);

  let token = null;
  if (created.status === 201 && created.body?.requires_verify) {
    const code = await waitForMailCode(email);
    record(Boolean(code), "mailpit.code", code ? "six digits from Mailpit" : "no message in 20s");
    if (code) {
      const verified = await req(`${API}/api/v1/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      token = verified.body?.token ?? null;
      record(verified.status === 200 && Boolean(token), "api.verify", `status=${verified.status} token=${Boolean(token)}`);
    }
  }

  if (token) {
    const mine = await req(`${API}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
    record(mine.status === 200 && mine.body?.user?.email === email, "api.me.authed", `status=${mine.status}`);
    const settings = await req(`${API}/api/v1/account/settings`, { headers: { authorization: `Bearer ${token}` } });
    record(settings.status === 200, "api.account.settings", `status=${settings.status}`);
    const checkout = await req(`${API}/api/v1/billing/checkout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        success_url: "https://evil.example/paywall",
        cancel_url: "http://localhost:8081/paywall",
      }),
    });
    record(checkout.status === 400, "api.checkout.open-redirect", `status=${checkout.status}`);
  }

  const routes = ["/", "/account", "/news", "/memory", "/practice", "/daily", "/paywall", "/guide", "/settings", "/reset", "/admin", "/quiz"];
  for (const route of routes) {
    const page = await req(`${APP}${route}`);
    record(page.status === 200, `web${route === "/" ? "/home" : route}`, `status=${page.status}`);
  }

  await probeUi(token);

  console.log("");
  console.log(`passed=${passed} failed=${failed}`);
  if (findings.length) {
    console.log("failures:");
    for (const item of findings) {
      console.log(`- ${item.id}: ${item.detail}`);
    }
  }
  process.exitCode = failed ? 1 : 0;
}

async function waitForMailCode(email, tries = 20) {
  for (let i = 0; i < tries; i += 1) {
    const list = await req(`${MAIL}/api/v1/messages`);
    const messages = list.body?.messages ?? [];
    const hit = messages.find((item) => String(item.To?.[0]?.Address ?? item.to ?? "").toLowerCase() === email);
    const id = hit?.ID ?? hit?.id;
    if (id) {
      const full = await req(`${MAIL}/api/v1/message/${id}`);
      const blob = `${full.body?.Text ?? ""} ${full.body?.HTML ?? ""} ${full.body?.Snippet ?? ""}`;
      const match = blob.match(/\b(\d{6})\b/);
      if (match) {
        return match[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

async function probeUi(hasSession) {
  try {
    const playwright = await import("playwright").catch(() => null);
    if (!playwright) {
      console.log("SKIP  ui.playwright  playwright not installed; using HTTP-only web checks");
      return;
    }
    const browser = await playwright.chromium.launch({ channel: "msedge", headless: true }).catch(() =>
      playwright.chromium.launch({ headless: true }),
    );
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto(`${APP}/account`, { waitUntil: "networkidle", timeout: 45_000 });
    const emailLabel = await page.getByLabel(/e-mail/i).count();
    const passwordLabel = await page.getByLabel(/^senha$/i).count();
    record(emailLabel > 0 && passwordLabel > 0, "ui.account.labels", `email=${emailLabel} password=${passwordLabel}`);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${APP}/`, { waitUntil: "networkidle", timeout: 45_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8);
    record(!overflow, "ui.home.no-h-scroll-375", `overflow=${overflow}`);
    const menu = await page.getByLabel("Abrir menu").count();
    record(menu > 0, "ui.home.menu-375", `menu=${menu}`);
    const unique = [...new Set(errors)].filter((item) => !item.includes("Download the React DevTools"));
    record(unique.length === 0, "ui.console.clean", unique.length ? unique.slice(0, 5).join(" | ") : "no page errors");
    await browser.close();
    void hasSession;
  } catch (error) {
    record(false, "ui.playwright", error instanceof Error ? error.message : String(error));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
