import { request } from "./http";
import {
  CheckpointFinishSchema,
  CheckpointStartSchema,
  PathResponseSchema,
  SessionCompleteResponseSchema,
  UnitTestFinishSchema,
  UnitTestStartSchema,
  type CheckpointFinish,
  type CheckpointStart,
  type PathResponse,
  type PathTestAnswer,
  type SessionCompleteBody,
  type SessionCompleteResponse,
  type UnitTestFinish,
  type UnitTestStart,
} from "./schemas/path";

/**
 * Cliente da trilha híbrida (docs/12-trilha-contrato.md). Todas as rotas exigem sessão.
 */

/** Chaves do React Query da trilha. Invalidar `pathKeys.all` atualiza Trilha e Hoje. */
export const pathKeys = {
  all: ["path"] as const,
  view: (p: { userId: string; target: string; level: string; locale: string }) => ["path", p.userId, p.target, p.level, p.locale] as const,
};

/** Trilha do idioma ativo da conta, com título e metas no idioma de interface pedido. */
export async function fetchPath(locale: string, signal?: AbortSignal, timeoutMs = 15_000): Promise<PathResponse> {
  return request<PathResponse>("/api/v1/path", {
    method: "GET",
    query: { locale },
    schema: PathResponseSchema,
    auth: "required",
    signal,
    timeoutMs,
  });
}

/** Registra a sessão diária concluída (ofensiva e progresso da unidade). Idempotente por dia. */
export async function completeSession(body: SessionCompleteBody): Promise<SessionCompleteResponse> {
  return request<SessionCompleteResponse>("/api/v1/sessions/complete", {
    method: "POST",
    body,
    schema: SessionCompleteResponseSchema,
    auth: "required",
  });
}

/** Abre o teste da unidade. 409 quando a unidade não está ativa ou os critérios 1–3 faltam. */
export async function startUnitTest(unitId: string): Promise<UnitTestStart> {
  return request<UnitTestStart>(`/api/v1/path/units/${encodeURIComponent(unitId)}/test/start`, {
    method: "POST",
    body: {},
    schema: UnitTestStartSchema,
    auth: "required",
    // O servidor pode gerar os itens com IA antes de responder.
    timeoutMs: 60_000,
  });
}

export async function finishUnitTest(unitId: string, attemptId: string, answers: PathTestAnswer[]): Promise<UnitTestFinish> {
  return request<UnitTestFinish>(`/api/v1/path/units/${encodeURIComponent(unitId)}/test/finish`, {
    method: "POST",
    body: { attempt_id: attemptId, answers },
    schema: UnitTestFinishSchema,
    auth: "required",
    timeoutMs: 30_000,
  });
}

/** Abre o checkpoint da banda atual (itens do banco de nivelamento daquela faixa). */
export async function startCheckpoint(): Promise<CheckpointStart> {
  return request<CheckpointStart>("/api/v1/path/checkpoint/start", {
    method: "POST",
    body: {},
    schema: CheckpointStartSchema,
    auth: "required",
    timeoutMs: 60_000,
  });
}

export async function finishCheckpoint(attemptId: string, answers: PathTestAnswer[]): Promise<CheckpointFinish> {
  return request<CheckpointFinish>("/api/v1/path/checkpoint/finish", {
    method: "POST",
    body: { attempt_id: attemptId, answers },
    schema: CheckpointFinishSchema,
    auth: "required",
    timeoutMs: 30_000,
  });
}
