import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPath, pathKeys } from "@/api/path";
import type { PathResponse } from "@/api/schemas/path";
import { useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { flushOutbox, outboxKey } from "./session-outbox";

/**
 * Trilha do curso ativo (GET /path), compartilhada por Trilha, Hoje e a sessão diária.
 * A chave inclui o nível: quando o nivelamento ou o checkpoint muda o nível, a trilha é buscada de novo.
 */
export function usePath(options: { enabled?: boolean; timeoutMs?: number; retry?: boolean } = {}) {
  const session = useSession();
  const locale = useLocale();
  const userId = session?.user.id ?? "";
  const target = session?.user.target_lang ?? "";
  const level = session?.user.level ?? "";
  return useQuery<PathResponse>({
    queryKey: pathKeys.view({ userId, target, level, locale }),
    queryFn: ({ signal }) => fetchPath(locale, signal, options.timeoutMs),
    enabled: Boolean(session && target) && options.enabled !== false,
    staleTime: 30_000,
    ...(options.retry === false ? { retry: false } : {}),
  });
}

/**
 * Ao ganhar foco (Trilha, Hoje): reenvia a sessão concluída que ficou guardada sem rede
 * e busca a trilha de novo se ela estiver velha.
 */
export function usePathFocusRefresh(query: { isStale: boolean; refetch: () => unknown }): void {
  const session = useSession();
  const userId = session?.user.id;
  const target = session?.user.target_lang;
  const latest = useRef(query);
  latest.current = query;
  useFocusEffect(
    useCallback(() => {
      if (userId && target) {
        void flushOutbox(outboxKey(userId, target));
      }
      if (latest.current.isStale) {
        void latest.current.refetch();
      }
    }, [userId, target]),
  );
}
