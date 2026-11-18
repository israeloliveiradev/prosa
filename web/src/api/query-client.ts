import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { kv } from "@/lib/kv";
import { ApiError } from "./errors";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      persist?: boolean;
    };
  }
}

export const QUERY_STORAGE_KEY = "prosa.query.v1";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos padrão
      gcTime: 1000 * 60 * 60 * 24 * 14, // 14 dias
      networkMode: "offlineFirst",
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        if (error instanceof ApiError) {
          if (error.kind === "auth" || error.kind === "schema") return false;
          if (error.status !== null && error.status >= 400 && error.status < 500) return false;
        }
        return true;
      },
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 0,
    },
  },
});

export const persister = createSyncStoragePersister({
  key: QUERY_STORAGE_KEY,
  storage: {
    getItem: (key) => kv.getString(key) ?? null,
    setItem: (key, value) => {
      kv.set(key, value);
    },
    removeItem: (key) => {
      kv.delete(key);
    },
  },
});

export const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 14,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { meta?: { persist?: boolean } }) => {
      return query.meta?.persist === true;
    },
  },
};

/**
 * Limpa o cache em memória e o armazenamento persistente ao sair da conta.
 */
export function clearQueryStorage(): void {
  queryClient.clear();
  kv.delete(QUERY_STORAGE_KEY);
}
