/**
 * Base da auditoria E2E (M5): o app de verdade (build estático em :8081) contra o backend
 * de verdade (Docker: API :3000, Postgres :5433, Redis, Mailpit :8025) e a IA de verdade.
 *
 * - `guard` (automático): falha o teste em qualquer console.error, pageerror ou resposta >= 400
 *   que o teste não tenha declarado como esperada com `guard.allow(/regex/)`.
 * - `createAccount`: conta real (cadastro + código do Mailpit), com espera quando bate o limite.
 * - `seedSession`: injeta sessão/jornada/idioma no localStorage (chaves "prosa\…" do MMKV web).
 * - `api` / `sql`: chamadas diretas à API e ao Postgres (para preparar estado, nunca para "passar").
 * - `assertLayout`: sem rolagem lateral e sem texto cortado para fora da tela.
 * - `installAudioProbe` / `readAudioProbe`: o que o app tocou (sampleRate, playbackRate, Web Speech).
 * - `installFakeMic`: microfone falso com silêncio ou tom (o Chromium já tem o tom com a flag).
 */
import { test as base, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

export const APP = process.env.AUDIT_APP_URL ?? "http://127.0.0.1:8081";
export const API = process.env.AUDIT_API_URL ?? "http://127.0.0.1:3000";
export const MAILPIT = process.env.AUDIT_MAILPIT_URL ?? "http://127.0.0.1:8025";

/** Barra invertida montada em código: heredocs e editores já comeram a do "prosa\\" literal. */
const KEY = "prosa" + String.fromCharCode(92);

export type TargetLang = "en" | "es" | "de" | "fr" | "it" | "ja" | "ru";
export type UiLocale = "pt" | "en" | "de" | "fr" | "es" | "it" | "ja";

export interface Session {
  token: string;
  user: { id: string; email: string; native_lang: string; target_lang: string; level: string; display_locale?: string; [key: string]: unknown };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postJson(path: string, body: unknown, token?: string) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function latestCode(email: string, since: number): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
    if (search.ok) {
      const data: any = await search.json();
      for (const message of data.messages ?? []) {
        if (Date.parse(message.Created) < since) continue;
        const full: any = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`).then((r) => r.json());
        const match = `${full.Subject ?? ""}\n${full.Text ?? ""}\n${full.HTML ?? ""}`.match(/\b(\d{6})\b/);
        if (match) return match[1];
      }
    }
    await sleep(500);
  }
  throw new Error(`Nenhum código chegou ao Mailpit para ${email}`);
}

let counter = 0;
let mailChecked = false;

/**
 * Trava de segurança: a auditoria cria centenas de contas. Se a API do Docker tiver um provedor
 * de e-mail REAL configurado (Mailjet, Resend, Brevo), cada cadastro manda um e-mail de verdade
 * pela conta do dono. Em 2026-11-22 isso esgotou a cota do Mailjet. Só segue com o Mailpit.
 */
export function assertLocalMailOnly(): void {
  if (mailChecked || process.env.AUDIT_ALLOW_REAL_MAIL === "1") {
    return;
  }
  const script = String.raw`for v in MAILJET_API_KEY RESEND_API_KEY BREVO_API_KEY; do eval "x=\${$v}"; if [ -n "$x" ]; then echo "$v"; fi; done; true`;
  const configured = execFileSync("docker", ["exec", "prosa-api", "sh", "-c", script], { encoding: "utf8" }).trim();
  if (configured) {
    throw new Error(
      `A API está configurada para mandar e-mail real (${configured.split(/\s+/).join(", ")}). ` +
        "Suba a API com o override da auditoria, que zera essas variáveis: " +
        "docker compose -f docker-compose.yml -f docker-compose.audit.yml up -d --build api",
    );
  }
  mailChecked = true;
}

/** E-mail único por chamada: prefixo do bloco + relógio + contador. */
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `audit-${prefix}-${Date.now().toString(36)}${counter}@prosa.test`;
}

/**
 * Cria uma conta REAL e devolve a sessão. O cadastro tem limite de 8/min por IP: em 429,
 * espera e tenta de novo (até ~2 min), em vez de falhar o teste por causa do limite.
 */
export async function createAccount(options: {
  prefix: string;
  target?: TargetLang;
  native?: string;
  level?: string;
  locale?: UiLocale;
  password?: string;
}): Promise<Session> {
  assertLocalMailOnly();
  const email = uniqueEmail(options.prefix);
  const password = options.password ?? "senha12345";
  const since = Date.now() - 2000;
  let created = await postJson("/api/v1/auth/register", {
    email,
    password,
    native_lang: options.native ?? "pt",
    target_lang: options.target ?? "en",
    level: options.level ?? "A1",
  });
  for (let attempt = 0; created.status === 429 && attempt < 12; attempt += 1) {
    await sleep(10_000);
    created = await postJson("/api/v1/auth/register", {
      email,
      password,
      native_lang: options.native ?? "pt",
      target_lang: options.target ?? "en",
      level: options.level ?? "A1",
    });
  }
  if (created.status !== 201) {
    throw new Error(`Cadastro falhou (${created.status}): ${JSON.stringify(created.json)}`);
  }
  const code = await latestCode(email, since);
  const verified = await postJson("/api/v1/auth/verify", { email, code });
  if (!verified.json?.token) {
    throw new Error(`Verificação falhou (${verified.status}): ${JSON.stringify(verified.json)}`);
  }
  const session: Session = { token: verified.json.token, user: verified.json.user };
  if (options.locale) {
    await api(session.token, "PATCH", "/api/v1/account/settings", { display_locale: options.locale });
    session.user.display_locale = options.locale;
  }
  return session;
}

/** Chamada direta à API com o token do aluno (preparar estado ou conferir o que o app gravou). */
export async function api(token: string | null, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

/**
 * SQL no Postgres do Docker (psql -At: linhas com campos separados por "|").
 * Só para preparar estado que levaria dias de uso real (ex.: estabilidade FSRS ≥ 3 dias).
 */
export function sql(query: string): string[] {
  const out = execFileSync(
    "docker",
    ["exec", "-i", "prosa-postgres", "sh", "-c", 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At'],
    { input: query, encoding: "utf8", env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
  );
  return out.split(/\r?\n/).filter((line) => line.length > 0);
}

/** Sessão, jornada concluída (ou não), dicas já vistas e idioma local, antes do primeiro carregamento. */
export async function seedSession(page: Page, session: Session, options: { journeyDone?: boolean; locale?: UiLocale } = {}): Promise<void> {
  const journeyDone = options.journeyDone ?? true;
  await page.addInitScript(
    ({ key, session, journeyDone, locale }) => {
      localStorage.setItem(`${key}prosa.session.v1`, JSON.stringify(session));
      if (journeyDone) {
        localStorage.setItem(`${key}prosa.journey.v1`, JSON.stringify({ userId: session.user.id, done: true, step: "ready", minutes: 20 }));
      }
      localStorage.setItem(`${key}prosa.guide.v1`, JSON.stringify({ seen: ["daily", "memory", "news", "practice"] }));
      if (locale) localStorage.setItem(`${key}prosa.locale.v1`, locale);
    },
    { key: KEY, session, journeyDone, locale: options.locale ?? null },
  );
}

/** Lê uma chave do MMKV web (ex.: "prosa.journey.v1"). */
export async function readStore(page: Page, name: string): Promise<string | null> {
  return page.evaluate(([key, name]) => localStorage.getItem(`${key}${name}`), [KEY, name] as const);
}

/** Sem rolagem lateral e sem elemento de texto visível saindo da tela pela direita. */
export async function assertLayout(page: Page, label = page.url()): Promise<void> {
  const report = await page.evaluate(() => {
    const width = window.innerWidth;
    const overflowX = document.documentElement.scrollWidth - width;
    const clipped: string[] = [];
    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const el = element as HTMLElement;
      if (!el.childNodes.length || !Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right > width + 2 && rect.left < width) clipped.push(`${(el.textContent ?? "").trim().slice(0, 40)} (right=${Math.round(rect.right)})`);
    }
    return { overflowX, clipped: clipped.slice(0, 5) };
  });
  expect(report.overflowX, `rolagem lateral em ${label}`).toBeLessThanOrEqual(1);
  expect(report.clipped, `texto saindo da tela em ${label}`).toEqual([]);
}

/** Registra o que o app toca: buffers de áudio, <audio>, Web Speech e osciladores. */
export async function installAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe = { buffers: [] as number[], media: [] as Array<{ rate: number; preservesPitch: boolean; src: string }>, speech: [] as Array<{ lang: string; text: string; voice: string | null }>, oscillators: 0, contexts: [] as number[] };
    (window as any).__audioProbe = probe;
    const Ctx = (window as any).AudioContext;
    if (Ctx) {
      const createBuffer = Ctx.prototype.createBuffer;
      Ctx.prototype.createBuffer = function (channels: number, length: number, sampleRate: number) {
        probe.buffers.push(sampleRate);
        return createBuffer.call(this, channels, length, sampleRate);
      };
      const createOscillator = Ctx.prototype.createOscillator;
      Ctx.prototype.createOscillator = function () {
        probe.oscillators += 1;
        return createOscillator.call(this);
      };
    }
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      probe.media.push({ rate: this.playbackRate, preservesPitch: (this as any).preservesPitch !== false, src: String(this.currentSrc || this.src).slice(0, 80) });
      return play.call(this);
    };
    if (window.speechSynthesis) {
      const speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        probe.speech.push({ lang: utterance.lang, text: utterance.text.slice(0, 80), voice: utterance.voice?.name ?? null });
        return speak(utterance);
      };
    }
  });
}

export async function readAudioProbe(page: Page): Promise<{ buffers: number[]; media: Array<{ rate: number; preservesPitch: boolean; src: string }>; speech: Array<{ lang: string; text: string; voice: string | null }>; oscillators: number }> {
  return page.evaluate(() => (window as any).__audioProbe ?? { buffers: [], media: [], speech: [], oscillators: 0 });
}

/**
 * Microfone falso. "tone": tom de 440 Hz (voz presente). "silence": stream mudo. Também troca o
 * SpeechRecognition por um que "ouve" `transcript` (ou nada, no silêncio).
 */
export async function installFakeMic(page: Page, mode: "tone" | "silence", transcript = ""): Promise<void> {
  await page.addInitScript(
    ({ mode, transcript }) => {
      const make = async () => {
        const ctx = new AudioContext();
        const dst = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = mode === "silence" ? 0 : 0.6;
        osc.frequency.value = 440;
        osc.connect(gain).connect(dst);
        osc.start();
        return dst.stream;
      };
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => make();
      }
      class FakeRecognition extends EventTarget {
        lang = "";
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onresult: ((event: any) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        onstart: (() => void) | null = null;
        start() {
          setTimeout(() => this.onstart?.(), 10);
          setTimeout(() => {
            if (mode === "tone" && transcript) {
              const result = [{ transcript, confidence: 0.9 }];
              (result as any).isFinal = true;
              const event = { resultIndex: 0, results: [result] };
              this.onresult?.(event);
              this.dispatchEvent(Object.assign(new Event("result"), event));
            }
            this.onend?.();
            this.dispatchEvent(new Event("end"));
          }, 600);
        }
        stop() {
          this.onend?.();
        }
        abort() {
          this.onend?.();
        }
      }
      (window as any).SpeechRecognition = FakeRecognition;
      (window as any).webkitSpeechRecognition = FakeRecognition;
    },
    { mode, transcript },
  );
}

export interface Guard {
  /** Declara uma falha esperada (ex.: 404 de um token inválido testado de propósito). */
  allow(pattern: RegExp): void;
  problems(): string[];
}

export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page }, use, testInfo) => {
      const allowed: RegExp[] = [/favicon/, /Download the React DevTools/];
      const seen: string[] = [];
      const record = (line: string) => {
        if (!allowed.some((pattern) => pattern.test(line))) seen.push(line);
      };
      page.on("console", (message) => {
        // "Failed to load resource" não traz a URL no texto: ela vem em location(), e o allow() precisa dela.
        if (message.type() === "error") record(`console.error: ${message.text().slice(0, 300)} @ ${message.location()?.url ?? ""}`);
      });
      page.on("pageerror", (error) => record(`pageerror: ${String(error).slice(0, 300)}`));
      page.on("response", (response) => {
        if (response.status() >= 400) record(`${response.status()} ${response.request().method()} ${response.url().replace(API, "").replace(APP, "")}`);
      });
      page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText ?? "";
        // Navegar para outra rota aborta pedidos em voo; isso não é defeito do app.
        if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(failure)) record(`requestfailed ${request.method()} ${request.url()} ${failure}`);
      });
      const guard: Guard = {
        allow: (pattern) => {
          allowed.push(pattern);
        },
        problems: () => seen.filter((line) => !allowed.some((pattern) => pattern.test(line))),
      };
      await use(guard);
      const problems = guard.problems();
      if (problems.length > 0) {
        await testInfo.attach("console-and-network", { body: problems.join("\n"), contentType: "text/plain" });
      }
      expect(problems, "console.error / pageerror / resposta >= 400 inesperados").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
