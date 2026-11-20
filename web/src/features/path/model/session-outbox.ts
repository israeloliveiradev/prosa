import { completeSession, pathKeys } from "@/api/path";
import { queryClient } from "@/api/query-client";
import type { SessionCompleteBody, SessionCompleteResponse } from "@/api/schemas/path";
import { kv } from "@/lib/kv";
import { completionRetriable, parseOutbox, type OutboxState } from "./outbox-model";

/**
 * Envio da sessão concluída (POST /sessions/complete) com fila de uma posição por aluno e idioma.
 *
 * A rota é idempotente por (usuário, idioma, data), então reenviar é seguro. Sem rede, o pedido
 * fica guardado e sai na próxima abertura de Hoje, da Trilha ou da sessão. A ofensiva do aparelho
 * continua valendo enquanto isso (é o fallback offline).
 */

const PREFIX = "prosa.session-complete.v1";

export function outboxKey(userId: string, targetLang: string): string {
  return `${PREFIX}:${userId}:${targetLang}`;
}

export function readOutbox(key: string): OutboxState {
  try {
    return parseOutbox(kv.getString(key));
  } catch {
    return { pending: null, last: null };
  }
}

function writeOutbox(key: string, state: OutboxState): void {
  try {
    kv.set(key, JSON.stringify(state));
  } catch {
    // Armazenamento indisponível: o envio segue só em memória.
  }
}

export type CompletionResult =
  | { kind: "saved"; response: SessionCompleteResponse }
  | { kind: "queued" }
  | { kind: "rejected"; message: string };

const inFlight = new Map<string, Promise<CompletionResult>>();

export function sendCompletion(key: string, body: SessionCompleteBody): Promise<CompletionResult> {
  const running = inFlight.get(key);
  if (running) {
    return running;
  }
  const task = (async (): Promise<CompletionResult> => {
    writeOutbox(key, { ...readOutbox(key), pending: body });
    try {
      const response = await completeSession(body);
      writeOutbox(key, { pending: null, last: { date: body.date, streak: response.streak_count } });
      void queryClient.invalidateQueries({ queryKey: pathKeys.all });
      return { kind: "saved", response };
    } catch (error) {
      if (completionRetriable(error)) {
        return { kind: "queued" };
      }
      // O servidor recusou o pedido (4xx): não adianta repetir.
      writeOutbox(key, { ...readOutbox(key), pending: null });
      return { kind: "rejected", message: error instanceof Error ? error.message : String(error) };
    }
  })();
  inFlight.set(key, task);
  void task.finally(() => inFlight.delete(key));
  return task;
}

/** Reenvia a sessão guardada, se houver. */
export async function flushOutbox(key: string): Promise<CompletionResult | null> {
  const { pending } = readOutbox(key);
  if (!pending) {
    return null;
  }
  return sendCompletion(key, pending);
}
