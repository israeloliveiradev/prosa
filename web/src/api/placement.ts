import { request } from "./http";
import {
  PlacementAttemptSchema,
  PlacementFinishSchema,
  PlacementHistoryResponseSchema,
  PlacementStatusSchema,
  PlacementStepSchema,
  type PlacementAttempt,
  type PlacementFinish,
  type PlacementHistoryEntry,
  type PlacementStatus,
  type PlacementStep,
} from "./schemas/placement";

/**
 * Cliente do nivelamento adaptativo (`/api/v1/placement/*`).
 *
 * O token vem da sessão (`auth: "required"`). As assinaturas antigas, que
 * recebiam o token como primeiro argumento, continuam aceitas para quem ainda
 * chama assim (`lib/first-day.ts`).
 */

interface PlacementTrack {
  target_lang?: string;
  through_lang?: string;
}

/** Um token de sessão é longo; um código de idioma tem 2 letras. */
function looksLikeLang(value: string | undefined): value is string {
  return typeof value === "string" && /^[a-z]{2}$/i.test(value);
}

/** Status do idioma: último resultado, janela de reteste, tentativa aberta e histórico. */
export async function fetchPlacementStatus(
  targetLangOrToken?: string,
  targetLangIfTokenPassed?: string,
  signal?: AbortSignal,
): Promise<PlacementStatus> {
  const targetLang = looksLikeLang(targetLangIfTokenPassed)
    ? targetLangIfTokenPassed
    : looksLikeLang(targetLangOrToken)
      ? targetLangOrToken
      : undefined;

  return request<PlacementStatus>("/api/v1/placement/status", {
    method: "GET",
    query: targetLang ? { target_lang: targetLang.toLowerCase() } : undefined,
    schema: PlacementStatusSchema,
    auth: "required",
    signal,
  });
}

/** Tentativas concluídas do idioma, da mais antiga para a mais recente. */
export async function fetchPlacementHistory(targetLang?: string, signal?: AbortSignal): Promise<PlacementHistoryEntry[]> {
  const body = await request("/api/v1/placement/history", {
    method: "GET",
    query: looksLikeLang(targetLang) ? { target_lang: targetLang.toLowerCase() } : undefined,
    schema: PlacementHistoryResponseSchema,
    auth: "required",
    signal,
  });
  return body.history;
}

/** Abre uma tentativa nova, ou devolve a que ainda está aberta (até 2 horas). */
export async function startPlacement(
  tokenOrTrack?: string | PlacementTrack,
  trackIfTokenPassed?: PlacementTrack,
): Promise<PlacementAttempt> {
  const track = typeof tokenOrTrack === "object" ? tokenOrTrack : trackIfTokenPassed;
  const body: PlacementTrack = {};
  if (looksLikeLang(track?.target_lang)) {
    body.target_lang = track.target_lang.toLowerCase();
  }
  if (looksLikeLang(track?.through_lang)) {
    body.through_lang = track.through_lang.toLowerCase();
  }

  return request<PlacementAttempt>("/api/v1/placement/start", {
    method: "POST",
    body,
    schema: PlacementAttemptSchema,
    auth: "required",
    // Com o banco de perguntas baixo, o servidor gera itens novos com IA antes de responder.
    timeoutMs: 60_000,
  });
}

/**
 * Responde a pergunta pendente. O motor devolve a próxima (`next`) ou `done`.
 *
 * Assinaturas aceitas:
 * - `answerPlacement(attemptId, itemId, choice)`
 * - `answerPlacement(token, attemptId, itemId, choice)` (antiga)
 */
export async function answerPlacement(
  attemptIdOrToken: string,
  itemIdOrAttemptId: string,
  choiceOrItemId: number | string,
  maybeChoice?: number,
): Promise<PlacementStep> {
  const isLegacy = typeof maybeChoice === "number";
  const attempt_id = isLegacy ? itemIdOrAttemptId : attemptIdOrToken;
  const item_id = isLegacy ? String(choiceOrItemId) : itemIdOrAttemptId;
  const choice = isLegacy ? maybeChoice : Number(choiceOrItemId);

  return request<PlacementStep>("/api/v1/placement/answer", {
    method: "POST",
    body: { attempt_id, item_id, choice },
    schema: PlacementStepSchema,
    auth: "required",
    timeoutMs: 60_000,
  });
}

/**
 * Fecha a tentativa: o servidor calcula o nível, grava no curso e no usuário,
 * e devolve faixas, habilidades e histórico.
 *
 * Assinaturas aceitas: `finishPlacement(attemptId)` e `finishPlacement(token, attemptId)`.
 */
export async function finishPlacement(attemptIdOrToken: string, maybeAttemptId?: string): Promise<PlacementFinish> {
  const attempt_id = maybeAttemptId ?? attemptIdOrToken;

  return request<PlacementFinish>("/api/v1/placement/finish", {
    method: "POST",
    body: { attempt_id },
    schema: PlacementFinishSchema,
    auth: "required",
    timeoutMs: 30_000,
  });
}
