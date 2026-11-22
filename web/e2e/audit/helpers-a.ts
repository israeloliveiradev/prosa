/** Auxiliares do agente A (blocos 1 a 7). Não altera a base da auditoria. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, MAILPIT, api, sql, type Session } from "./fixtures";

/** Elemento visível com esse testID (pilhas de telas escondidas mantêm os testIDs). */
export function tid(page: Page, id: string): Locator {
  return page.getByTestId(id).filter({ visible: true }).first();
}

/** Clica o botão de dentro do wrapper com testID (ou o próprio elemento, se não houver botão dentro). */
export async function press(page: Page, id: string): Promise<void> {
  const wrapper = tid(page, id);
  await expect(wrapper, `testID ${id} visível`).toBeVisible();
  const inner = wrapper.locator("button, [role=button]").first();
  if ((await inner.count()) > 0) {
    await inner.click();
  } else {
    await wrapper.click();
  }
}

/** Estado "desabilitado" pelo atributo ARIA ou nativo do botão de dentro. */
export async function isDisabled(page: Page, id: string): Promise<boolean> {
  const wrapper = tid(page, id);
  const inner = wrapper.locator("button, [role=button]").first();
  const target = (await inner.count()) > 0 ? inner : wrapper;
  return target.evaluate((el) => (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true");
}

/** Código de 6 dígitos mais novo do Mailpit para um e-mail. */
export async function mailCode(email: string, since: number): Promise<string> {
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
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Nenhum código no Mailpit para ${email}`);
}

/** Linha única do banco como objeto simples (psql -At separa por "|"). */
export function userRow(userId: string): { goal: string; goal_note: string; daily_minutes: string; level: string; target_lang: string; native_lang: string; interests: string; display_locale: string; streak: string } {
  const [row] = sql(
    `SELECT coalesce(goal,''), coalesce(goal_note,''), daily_minutes, level, target_lang, native_lang, array_to_string(interests, ','), display_locale, streak_count FROM users WHERE id = '${userId}'`,
  );
  const [goal, goal_note, daily_minutes, level, target_lang, native_lang, interests, display_locale, streak] = (row ?? "").split("|");
  return { goal, goal_note, daily_minutes, level, target_lang, native_lang, interests, display_locale, streak };
}

/** Segura o rate limit de 8/min do cadastro: espera quando 429 (usado só no cadastro pela UI). */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Login direto pela API (token novo) para quem acabou de se cadastrar pela UI. */
export async function loginApi(email: string, password: string): Promise<Session> {
  const res = await api(null, "POST", "/api/v1/auth/login", { email, password });
  if (!res.json?.token) throw new Error(`login falhou (${res.status}): ${JSON.stringify(res.json)}`);
  return { token: res.json.token, user: res.json.user };
}

/** Data UTC (AAAA-MM-DD) deslocada em dias. */
export function utcDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** Data local (America/Sao_Paulo, o fuso do navegador da auditoria) deslocada em dias. */
export function localDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offsetDays * 86_400_000));
  return parts;
}

/**
 * WAV com fala de verdade (voz do sistema do Windows, SAPI) para o microfone falso do Chromium
 * (--use-file-for-fake-audio-capture). O tom do fixtures não é fala: o app responde "nenhuma fala detectada".
 */
export function speechWav(text: string, name: string): string {
  const dir = path.resolve(__dirname, "../../test-results/audit-a-media");
  const file = path.join(dir, `${name}.wav`);
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    const script = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft Zira Desktop'); $s.SetOutputToWaveFile('${file}'); $s.Speak('${text.replace(/'/g, "''")}'); $s.Dispose()`;
    execFileSync("powershell", ["-NoProfile", "-Command", script], { stdio: "ignore" });
  }
  return file;
}

/** Argumentos de lançamento da auditoria com o microfone falso lendo um arquivo WAV. */
export function micFileArgs(wav: string): string[] {
  return ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required", `--use-file-for-fake-audio-capture=${wav}`];
}
