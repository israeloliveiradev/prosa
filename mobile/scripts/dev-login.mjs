#!/usr/bin/env node
// Obtém uma sessão REAL do prosa-api local (Docker) para desenvolvimento e testes manuais.
//
// Uso:
//   node scripts/dev-login.mjs --email agent-a@prosa.test [--password senha12345]
//        [--target en] [--native pt] [--level A2] [--api http://127.0.0.1:3000]
//        [--mailpit http://127.0.0.1:8025] [--out caminho.json]
//
// Fluxo: tenta login; se a conta não existe, cadastra; se pedir verificação,
// lê o código de 6 dígitos no Mailpit e confirma. Imprime {token, user} em JSON.
//
// Para usar no navegador (Playwright), injete antes do carregamento:
//   localStorage.setItem("prosa\\prosa.session.v1", JSON.stringify({ token, user }))
//   localStorage.setItem("prosa\\prosa.journey.v1", JSON.stringify({ userId: user.id, done: true, step: "ready" }))
// (omita a jornada, ou use done:false, para cair no onboarding /start).
// Veja e2e/helpers/dev-session.mjs para o atalho `seedDevSession(page, session, { journeyDone })`.

import { writeFileSync } from "node:fs";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const api = arg("api", "http://127.0.0.1:3000");
const mailpit = arg("mailpit", "http://127.0.0.1:8025");
const email = arg("email", "dev@prosa.test").toLowerCase();
const password = arg("password", "senha12345");
const target = arg("target", "en");
const native = arg("native", "pt");
const level = arg("level", "A2");
const out = arg("out", "");

async function post(path, body) {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function latestCode(since) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
    if (search.ok) {
      const data = await search.json();
      for (const message of data.messages ?? []) {
        if (Date.parse(message.Created) < since) continue;
        const full = await fetch(`${mailpit}/api/v1/message/${message.ID}`).then((r) => r.json());
        const body = `${full.Subject ?? ""}\n${full.Text ?? ""}\n${full.HTML ?? ""}`;
        const match = body.match(/\b(\d{6})\b/);
        if (match) return match[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Nenhum código de verificação chegou ao Mailpit para ${email}`);
}

async function main() {
  const started = Date.now() - 2000;
  let result = await post("/api/v1/auth/login", { email, password });

  if (result.status === 401 || result.status === 404) {
    const created = await post("/api/v1/auth/register", {
      email,
      password,
      native_lang: native,
      target_lang: target,
      level,
    });
    if (created.status !== 201 && created.status !== 409) {
      throw new Error(`Cadastro falhou (${created.status}): ${JSON.stringify(created.json)}`);
    }
    result = created.status === 201 ? { status: 200, json: { requires_verify: true } } : await post("/api/v1/auth/login", { email, password });
  }

  if (result.json?.requires_verify) {
    const code = await latestCode(started);
    result = await post("/api/v1/auth/verify", { email, code });
  }

  if (result.json?.challenge || result.json?.ticket) {
    throw new Error("A conta pede segundo fator; use outro e-mail de desenvolvimento.");
  }

  if (!result.json?.token || !result.json?.user) {
    throw new Error(`Login falhou (${result.status}): ${JSON.stringify(result.json)}`);
  }

  const session = { token: result.json.token, user: result.json.user };
  const text = JSON.stringify(session, null, 2);
  if (out) writeFileSync(out, text);
  process.stdout.write(`${text}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
