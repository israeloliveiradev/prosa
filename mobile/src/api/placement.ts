import { request } from "./http";
import {
  PlacementStatusSchema,
  PlacementAttemptSchema,
  PlacementStepSchema,
  PlacementFinishSchema,
  type PlacementStatus,
  type PlacementAttempt,
  type PlacementStep,
  type PlacementFinish,
} from "./schemas/placement";

/**
 * Busca o status de nivelamento (Placement) para o idioma alvo.
 * Utilizado no boot e na tela inicial para verificar se há nivelamento pendente.
 */
export async function fetchPlacementStatus(
  targetLangOrToken?: string,
  targetLangIfTokenPassed?: string,
): Promise<PlacementStatus> {
  const targetLang =
    targetLangIfTokenPassed ??
    (targetLangOrToken && targetLangOrToken.length <= 10 ? targetLangOrToken : undefined);

  return request<PlacementStatus>("/api/v1/placement/status", {
    method: "GET",
    query: targetLang ? { target_lang: targetLang } : undefined,
    schema: PlacementStatusSchema,
    auth: "required",
  });
}

/**
 * Inicia uma nova tentativa de nivelamento ou retoma uma existente.
 */
export async function startPlacement(
  tokenOrTrack?: string | { target_lang?: string; through_lang?: string },
  trackIfTokenPassed?: { target_lang?: string; through_lang?: string },
): Promise<PlacementAttempt> {
  const track = typeof tokenOrTrack === "object" ? tokenOrTrack : trackIfTokenPassed;

  return request<PlacementAttempt>("/api/v1/placement/start", {
    method: "POST",
    body: track ?? {},
    schema: PlacementAttemptSchema,
    auth: "required",
  });
}

/**
 * Envia uma resposta a uma questão do nivelamento adaptativo.
 */
export async function answerPlacement(
  attemptIdOrToken: string,
  itemIdOrAttemptId: string,
  choiceOrItemId: number | string,
  maybeChoice?: number,
): Promise<PlacementStep> {
  // Suporta ambas assinaturas:
  // Legada: answerPlacement(token, attemptId, itemId, choice)
  // Nova: answerPlacement(attemptId, itemId, choice)
  const isLegacy = typeof maybeChoice === "number";
  const attempt_id = isLegacy ? itemIdOrAttemptId : attemptIdOrToken;
  const item_id = isLegacy ? (choiceOrItemId as string) : itemIdOrAttemptId;
  const choice = isLegacy ? maybeChoice : (choiceOrItemId as number);

  return request<PlacementStep>("/api/v1/placement/answer", {
    method: "POST",
    body: { attempt_id, item_id, choice },
    schema: PlacementStepSchema,
    auth: "required",
  });
}

/**
 * Finaliza a tentativa de nivelamento e calcula o nível CEFR atingido.
 */
export async function finishPlacement(
  attemptIdOrToken: string,
  maybeAttemptId?: string,
): Promise<PlacementFinish> {
  const attempt_id = maybeAttemptId ?? attemptIdOrToken;

  return request<PlacementFinish>("/api/v1/placement/finish", {
    method: "POST",
    body: { attempt_id },
    schema: PlacementFinishSchema,
    auth: "required",
  });
}
