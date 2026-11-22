/**
 * Ajudantes do agente B (blocos 8 a 14). Nada aqui troca a API por mock: só prepara estado que levaria
 * dias de uso (cartões FSRS, temas, objetivo) e lê o que o app de fato gravou.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { api, createAccount, sql, type Session, type TargetLang, type UiLocale } from "./fixtures";

export const AI_WAIT = 150_000;

/** Elemento visível com esse testID (pilhas escondidas do Expo Router mantêm os testIDs). */
export function tid(page: Page, id: string): Locator {
  return page.getByTestId(id).filter({ visible: true }).first();
}

/** Clica no botão de dentro de um wrapper com testID (ou no próprio elemento). */
export async function press(page: Page, id: string): Promise<void> {
  const wrapper = tid(page, id);
  await expect(wrapper).toBeVisible();
  const inner = wrapper.locator("button, [role=button]").first();
  if ((await inner.count()) > 0) {
    await inner.click();
  } else {
    await wrapper.click();
  }
}

/** Botão pelo rótulo acessível (aria-label ou texto), só os visíveis. */
export function button(page: Page, name: string | RegExp): Locator {
  return page.getByRole("button", { name }).filter({ visible: true }).first();
}

export interface LearnerOptions {
  prefix: string;
  target?: TargetLang;
  native?: string;
  level?: string;
  locale?: UiLocale;
  goal?: "career" | "travel" | "studies" | "culture" | "family" | "relocation";
  goalNote?: string;
  interests?: string[];
  minutes?: 10 | 20 | 30;
}

/**
 * Conta real + objetivo/temas/minutos na conta. Os temas vão por SQL (o endpoint de quiz chama a IA
 * para sugerir tópicos e o limite é de 8/min); o objetivo e os minutos, pela API de ajustes.
 * Devolve a sessão já com os campos da conta (como o app a veria depois do /auth/me).
 */
export async function createLearner(options: LearnerOptions): Promise<Session> {
  const session = await createAccount({
    prefix: options.prefix,
    ...(options.target ? { target: options.target } : {}),
    ...(options.native ? { native: options.native } : {}),
    ...(options.level ? { level: options.level } : {}),
    ...(options.locale ? { locale: options.locale } : {}),
  });
  if (options.interests) {
    const list = options.interests.map((item) => `'${item.replace(/'/g, "''")}'`).join(",");
    sql(`UPDATE users SET interests = ARRAY[${list}]::text[] WHERE id = '${session.user.id}'`);
  }
  const patch: Record<string, unknown> = {};
  if (options.goal) patch.goal = options.goal;
  if (options.goalNote) patch.goal_note = options.goalNote;
  if (options.minutes) patch.daily_minutes = options.minutes;
  if (Object.keys(patch).length > 0) {
    const saved = await api(session.token, "PATCH", "/api/v1/account/settings", patch);
    expect(saved.status).toBe(200);
  }
  const me = await api(session.token, "GET", "/api/v1/auth/me");
  expect(me.status).toBe(200);
  return { token: session.token, user: { ...session.user, ...me.json.user } };
}

export async function accountOf(token: string): Promise<any> {
  const response = await api(token, "GET", "/api/v1/auth/me");
  expect(response.status).toBe(200);
  return response.json.user;
}

export async function settingsOf(token: string): Promise<any> {
  const response = await api(token, "GET", "/api/v1/account/settings");
  expect(response.status).toBe(200);
  return response.json;
}

/** Id da unidade ativa da trilha (a que o Duelo-chefe aceita). */
export async function activeUnitId(token: string): Promise<string> {
  const path = await api(token, "GET", "/api/v1/path");
  expect(path.status).toBe(200);
  const id = path.json.current_unit_id as string | null;
  expect(id, "a trilha precisa ter uma unidade ativa").toBeTruthy();
  return id as string;
}

export interface SeedCard {
  front: string;
  back: string;
  context: string;
  /** Dias até o vencimento (negativo = atrasado). */
  dueInDays?: number;
  status?: "learning" | "reviewing" | "mastered";
  reps?: number;
  intervalDays?: number;
  stability?: number;
  difficulty?: number;
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** Cartões FSRS direto no Postgres (estado de dias de estudo). Retorna os ids na ordem. */
export function seedCards(userId: string, lang: TargetLang, cards: SeedCard[]): string[] {
  const ids: string[] = [];
  for (const card of cards) {
    const days = card.dueInDays ?? -1;
    const rows = sql(
      `INSERT INTO srs_cards (user_id, target_lang, front_phrase, back_translation, context_sentence, status, repetition_count, interval_days, stability, difficulty, next_review_at, last_review_at)
       VALUES ('${userId}', '${lang}', ${quote(card.front)}, ${quote(card.back)}, ${quote(card.context)}, '${card.status ?? "learning"}', ${card.reps ?? 1}, ${card.intervalDays ?? 1}, ${card.stability ?? 2}, ${card.difficulty ?? 5}, now() + interval '${days} days', now() - interval '3 days')
       RETURNING id`,
    );
    ids.push(rows[0]?.split("|")[0] ?? "");
  }
  return ids;
}

export interface CardState {
  id: string;
  reps: number;
  stability: number;
  intervalDays: number;
  status: string;
  dueMs: number;
}

export function cardState(userId: string, lang: TargetLang, front: string): CardState | null {
  const rows = sql(
    `SELECT id, repetition_count, stability, interval_days, status, extract(epoch from next_review_at)*1000
     FROM srs_cards WHERE user_id='${userId}' AND target_lang='${lang}' AND lower(front_phrase)=lower(${quote(front)})`,
  );
  const row = rows[0];
  if (!row) return null;
  const [id, reps, stability, interval, status, due] = row.split("|");
  return { id: id ?? "", reps: Number(reps), stability: Number(stability), intervalDays: Number(interval), status: status ?? "", dueMs: Number(due) };
}

/** XP total do curso ativo guardado no aparelho (MMKV web em localStorage). */
export async function xpTotal(page: Page): Promise<number> {
  const raw = await page.evaluate(() => {
    const key = "prosa" + String.fromCharCode(92) + "prosa.xp.v1";
    return localStorage.getItem(key);
  });
  if (!raw) return 0;
  const bag = JSON.parse(raw) as { activeLang?: string; lanes?: Record<string, { log?: Record<string, number> }> };
  let total = 0;
  for (const lane of Object.values(bag.lanes ?? {})) {
    for (const value of Object.values(lane.log ?? {})) total += Number(value) || 0;
  }
  return total;
}

/** Texto visível do corpo da página. */
export async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

/** Linhas do mentor/personagem: o rótulo "Ouvir: <texto>" do botão de áudio de cada balão. */
export async function spokenLines(page: Page, listenLabel: string): Promise<string[]> {
  return page.evaluate((label) => {
    const prefix = `${label}: `;
    return Array.from(document.querySelectorAll("[aria-label]"))
      .filter((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((el) => el.getAttribute("aria-label") ?? "")
      .filter((text) => text.startsWith(prefix))
      .map((text) => text.slice(prefix.length));
  }, listenLabel);
}

/** Heurística simples: o texto parece inglês (palavras funcionais) e não português. */
export function looksEnglish(text: string): boolean {
  const english = (text.match(/\b(the|you|your|i|is|are|a|an|to|and|of|for|in|it|what|how|do|my|with|that|this|have|would|like)\b/gi) ?? []).length;
  const portuguese = (text.match(/\b(você|não|uma|para|com|que|está|são|obrigado|olá|mais)\b/gi) ?? []).length;
  return english >= 2 && english > portuguese;
}
