import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform, View } from "react-native";
import { syncFirstDay } from "@/lib/first-day";
import { hydrateGuide } from "@/lib/guide";
import { hydrateJourney } from "@/lib/journey";
import { kv } from "@/lib/kv";
import { bindProgressLang, dropForeignGlosses, flushReviews, hydrateProgress, setPro } from "@/lib/progress";
import { getSession, hydrateSession, refreshSession, useSession } from "@/lib/session";
import { wipeDeviceStudy } from "@/lib/wipe-device";

const ReadyContext = createContext(false);

/**
 * Retorna se o armazenamento local do aplicativo concluiu a hidratação inicial.
 */
export function useProgressReady(): boolean {
  return useContext(ReadyContext);
}

export interface AppBootstrapProps {
  children: ReactNode;
}

/**
 * AppBootstrap: Gerencia a inicialização, hidratação de stores, sincronização
 * da sessão com o primeiro dia e o flush de revisões com a API.
 */
export function AppBootstrap({ children }: AppBootstrapProps) {
  const [ready, setReady] = useState(false);
  const session = useSession();
  const syncedFirstDay = useRef<string | null>(null);

  // 1. Hidratação dos stores locais e refresh inicial de sessão
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
  }, []);

  // 2. Sincronização FirstDay ao alterar a sessão ativa
  useEffect(() => {
    if (!session) {
      syncedFirstDay.current = null;
      return;
    }
    const stamp = `${session.user.id}:${session.user.target_lang}`;
    if (syncedFirstDay.current === stamp) {
      return;
    }
    syncedFirstDay.current = stamp;
    void syncFirstDay(session.token, session.user);
  }, [session]);

  // 3. Flush de revisões periódico, ao voltar para primeiro plano (AppState) e ao voltar a rede
  useEffect(() => {
    const runFlush = () => {
      if (getSession()) {
        void flushReviews();
      }
    };

    runFlush();
    const intervalTimer = setInterval(runFlush, 15_000);

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        runFlush();
      }
    });

    let onOnline: (() => void) | null = null;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      onOnline = () => {
        runFlush();
      };
      window.addEventListener("online", onOnline);
    }

    return () => {
      clearInterval(intervalTimer);
      subscription.remove();
      if (onOnline && typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
    };
  }, []);

  return (
    <ReadyContext.Provider value={ready}>
      {/* Marcador de hidratação e prontidão acessível pelo E2E */}
      {ready ? (
        <View
          testID="app-ready"
          style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
          {...(Platform.OS === "web"
            ? { ["data-testid" as any]: "app-ready", "aria-hidden": true }
            : { accessibilityElementsHidden: true, importantForAccessibility: "no" })}
        />
      ) : null}
      {children}
    </ReadyContext.Provider>
  );
}
