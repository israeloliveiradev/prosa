import { ApiError } from "@/api/errors";
import { SessionCompleteBodySchema, type SessionCompleteBody } from "@/api/schemas/path";

/** Estado guardado do envio da sessão: o pedido pendente e a última ofensiva vinda do servidor. */
export interface OutboxState {
  pending: SessionCompleteBody | null;
  last: { date: string; streak: number } | null;
}

/** Lê o estado guardado; qualquer coisa malformada vira vazio. */
export function parseOutbox(raw: unknown): OutboxState {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { pending: null, last: null };
    }
  }
  if (!value || typeof value !== "object") {
    return { pending: null, last: null };
  }
  const item = value as { pending?: unknown; last?: unknown };
  const pending = SessionCompleteBodySchema.safeParse(item.pending);
  const last = item.last as { date?: unknown; streak?: unknown } | null | undefined;
  const lastOk =
    last && typeof last === "object" && typeof last.date === "string" && typeof last.streak === "number" && Number.isFinite(last.streak) && last.streak >= 0
      ? { date: last.date, streak: Math.floor(last.streak) }
      : null;
  return { pending: pending.success ? pending.data : null, last: lastOk };
}

/** Vale tentar de novo: sem rede, lento, servidor fora (5xx), limite de taxa ou sem sessão agora. */
export function completionRetriable(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.kind === "network" || error.kind === "timeout" || error.kind === "auth") {
      return true;
    }
    if (error.kind === "schema") {
      return false;
    }
    const status = error.status ?? 0;
    return status >= 500 || status === 408 || status === 429 || status === 401;
  }
  return true;
}

/** Ofensiva a mostrar no fim da sessão: a do servidor quando é de hoje; senão a do aparelho. */
export function streakToShow(input: { server: { date: string; streak: number } | null; today: string; local: number }): { value: number; source: "server" | "device" } {
  if (input.server && input.server.date === input.today) {
    return { value: input.server.streak, source: "server" };
  }
  return { value: input.local, source: "device" };
}
