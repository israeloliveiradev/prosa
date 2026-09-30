import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { syncFirstDay } from "@/lib/first-day";
import { hydrateGuide } from "@/lib/guide";
import { hydrateJourney } from "@/lib/journey";
import { kv } from "@/lib/kv";
import { bindProgressLang, dropForeignGlosses, flushReviews, hydrateProgress, setPro } from "@/lib/progress";
import { getSession, hydrateSession, refreshSession, useSession } from "@/lib/session";
import { wipeDeviceStudy } from "@/lib/wipe-device";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 14,
      networkMode: "offlineFirst",
      retry: 1,
      staleTime: 1000 * 60 * 60,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

const persister = createSyncStoragePersister({
  key: "prosa.query.v1",
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

const ReadyContext = createContext(false);

export function useProgressReady(): boolean {
  return useContext(ReadyContext);
}

export function ProsaQueryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateProgress();
    hydrateSession();
    hydrateJourney();
    const current = getSession();
    if (current) {
      bindProgressLang(current.user.target_lang);
      dropForeignGlosses(current.user.native_lang);
    }
    kv.delete("prosa.guest.v1");
    hydrateGuide();
    setReady(true);
    void refreshSession().then(async (user) => {
      if (!user) {
        if (current) {
          wipeDeviceStudy(current.user.id);
        }
        return;
      }
      bindProgressLang(user.target_lang);
      dropForeignGlosses(user.native_lang);
      setPro(user.plan === "pro");
      const token = getSession()?.token;
      if (!token) {
        return;
      }
      await syncFirstDay(token, user);
    });
    void flushReviews();
    const timer = setInterval(() => {
      void flushReviews();
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ReadyContext.Provider value={ready}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 14 }}
      >
        <FirstDaySync>{children}</FirstDaySync>
      </PersistQueryClientProvider>
    </ReadyContext.Provider>
  );
}

function FirstDaySync({ children }: { children: ReactNode }) {
  const session = useSession();
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!session) {
      synced.current = null;
      return;
    }
    const stamp = `${session.user.id}:${session.user.target_lang}`;
    if (synced.current === stamp) {
      return;
    }
    synced.current = stamp;
    void syncFirstDay(session.token, session.user);
  }, [session]);

  return children;
}
