/**
 * Lógica pura das telas de Conversa (Mentor e Cenas) e da Leitura.
 * Sem React Native aqui: o teste unitário roda em Node.
 */

export type TalkTab = "mentor" | "scenes";

/** Aba de /talk a partir do parâmetro `?tab=`; qualquer outro valor abre o Mentor. */
export function talkTabFromParam(value: unknown): TalkTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "scenes" ? "scenes" : "mentor";
}

/**
 * Por que uma chamada à API falhou, para mostrar um estado honesto:
 * - `network`: o servidor do Prosa não respondeu (sem conexão, servidor fora);
 * - `ai`: o servidor respondeu, mas o modelo de IA não (ocupado, fora do ar, resposta inválida);
 * - `feed`: as fontes de notícia não responderam (só na Leitura);
 * - `other`: qualquer outro erro, mostrado com a mensagem que veio.
 *
 * `aiMessages` são as mensagens já traduzidas que `readError` (lib/api.ts) devolve para falhas do modelo.
 */
export type FailureKind = "network" | "ai" | "feed" | "other";

const NETWORK = /failed to fetch|networkerror|network request failed|load failed|err_connection|econnrefused|fetch failed/i;
const FEED = /news feed|feed is unavailable|returned no stories/i;
const AI = /model request failed|model is busy|high demand|unavailable|overloaded|quota|rate limit|timed? ?out|empty structured|not valid json|generation is paused|generation is unavailable/i;

export function classifyFailure(caught: unknown, aiMessages: readonly string[] = [], networkMessages: readonly string[] = []): FailureKind {
  const message = caught instanceof Error ? caught.message : typeof caught === "string" ? caught : "";
  if (caught instanceof TypeError && NETWORK.test(message)) {
    return "network";
  }
  if (NETWORK.test(message) || networkMessages.some((known) => known.length > 0 && message === known)) {
    return "network";
  }
  if (FEED.test(message)) {
    return "feed";
  }
  if (aiMessages.some((known) => known.length > 0 && message === known) || AI.test(message)) {
    return "ai";
  }
  return "other";
}

export interface HistoryLine<Role extends string> {
  role: Role;
  text: string;
}

/**
 * Histórico enviado ao servidor: só falas não vazias, cada uma com no máximo 500 caracteres
 * (limite do schema do backend) e no máximo `limit` falas, as mais recentes.
 */
export function trimHistory<Role extends string>(turns: ReadonlyArray<HistoryLine<Role>>, limit: number): Array<HistoryLine<Role>> {
  return turns
    .filter((turn) => turn.text.trim().length > 0)
    .slice(-limit)
    .map((turn) => ({ role: turn.role, text: turn.text.trim().slice(0, 500) }));
}

/** Tema curto para o mentor (o backend aceita 2 a 80 caracteres). */
export function proseTopic(candidates: ReadonlyArray<string | null | undefined>, fallback = "everyday life"): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim().slice(0, 80) ?? "";
    if (trimmed.length >= 2) {
      return trimmed;
    }
  }
  return fallback;
}

/** Trecho da lição para dar contexto ao mentor (o backend aceita até 700 caracteres). */
export function storyExcerpt(text: string | null | undefined, max = 700): string | undefined {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Substitui `{chave}` no texto pelos valores dados. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Nome de um idioma (código ISO) escrito no idioma de interface `localeTag` (BCP-47), via Intl.DisplayNames. */
export function languageLabel(code: string, localeTag: string): string {
  try {
    return new Intl.DisplayNames([localeTag], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
