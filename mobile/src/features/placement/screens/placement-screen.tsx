import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { Redirect, router, type Href } from "expo-router";
import { TactileButton } from "@/components/tactile/tactile-button";
import { Icon } from "@/components/shell/icon";
import { answerPlacement, fetchPlacementStatus, finishPlacement, startPlacement } from "@/api/placement";
import type { PlacementAttempt, PlacementFinish } from "@/api/schemas/placement";
import {
  currentItem,
  initialPlacementFlowState,
  isAttemptComplete,
  isOutOfSync,
  placementErrorKind,
  placementFlowReducer,
  skillSignals,
  toOutcome,
  applyAnswer,
  type PlacementOutcome,
} from "@/features/placement/model/placement-flow";
import { Question } from "@/features/placement/components/question";
import { Result } from "@/features/placement/components/result";
import { StatusPanel } from "@/features/placement/components/status-panel";
import { LoadingLine, PlacementNotice, SectionLabel } from "@/features/placement/components/parts";
import { postProfileSignals } from "@/lib/api";
import { canDoSignals } from "@/lib/can-do";
import { useAreaCopy } from "@/lib/copy/area";
import { PLACEMENT_COPY } from "@/lib/copy/placement";
import { tap } from "@/lib/haptics";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { rememberSkills } from "@/lib/progress";
import { getSession, refreshSession, rememberProfile, useSession } from "@/lib/session";

export type { PlacementOutcome } from "@/features/placement/model/placement-flow";

export interface PlacementScreenProps {
  /** Dentro de outro fluxo (onboarding): sem cabeçalho próprio nem rolagem, e o teste começa sozinho. */
  embedded?: boolean;
  /** Começa o teste ao abrir, sem a tela de status. Padrão: igual a `embedded`. */
  autoStart?: boolean;
  /** Chamado pelo botão final do resultado; sem ele, a tela volta para Hoje. */
  onFinished?: (outcome: PlacementOutcome) => void;
}

/**
 * Nivelamento adaptativo real (`/api/v1/placement/*`): status e espera entre testes,
 * perguntas servidas uma a uma pelo motor, fechamento com nível, faixas e habilidades,
 * e o nível novo propagado para a sessão.
 */
export function PlacementScreen({ embedded = false, autoStart, onFinished }: PlacementScreenProps = {}) {
  const startsAlone = autoStart ?? embedded;
  const session = useSession();
  const t = useAreaCopy(PLACEMENT_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const [state, dispatch] = useReducer(placementFlowReducer, { autoStart: startsAlone }, initialPlacementFlowState);

  const token = session?.token ?? null;
  const targetLang = session?.user.target_lang ?? "";
  const throughLang = session?.user.native_lang ?? "";
  const userLevel = session?.user.level ?? "";

  const alive = useRef(true);
  const busy = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadStatus = useCallback(async () => {
    if (!token || !targetLang) {
      return;
    }
    dispatch({ type: "STATUS_REQUESTED" });
    try {
      const status = await fetchPlacementStatus(targetLang);
      if (alive.current) {
        dispatch({ type: "STATUS_LOADED", status });
      }
    } catch (caught) {
      if (alive.current) {
        dispatch({ type: "STATUS_FAILED", error: placementErrorKind(caught) });
      }
    }
  }, [targetLang, token]);

  useEffect(() => {
    if (!startsAlone) {
      void loadStatus();
    }
  }, [loadStatus, startsAlone]);

  const applyLevel = useCallback(async (result: PlacementFinish) => {
    if (result.skills.length > 0) {
      rememberSkills(result.skills);
      const signals = skillSignals(result.skills);
      const current = getSession();
      if (current && Object.keys(signals).length > 0) {
        void postProfileSignals(current.token, result.target_lang, signals).catch(() => undefined);
      }
    }
    // O servidor já gravou o nível; a sessão local busca o usuário de novo (/auth/me).
    await refreshSession();
    const fresh = getSession();
    if (fresh && fresh.user.target_lang === result.target_lang && fresh.user.level !== result.level) {
      rememberProfile({ level: result.level });
    }
  }, []);

  const finish = useCallback(
    async (attemptId: string) => {
      dispatch({ type: "FINISH_REQUESTED" });
      try {
        const result = await finishPlacement(attemptId);
        await applyLevel(result).catch(() => undefined);
        if (!alive.current) {
          return;
        }
        dispatch({ type: "FINISH_SUCCEEDED", result });
        void tap("success");
      } catch (caught) {
        if (!alive.current) {
          return;
        }
        const kind = placementErrorKind(caught);
        if (kind === "closed") {
          dispatch({ type: "BACK_TO_STATUS" });
          void loadStatus();
          return;
        }
        dispatch({ type: "FINISH_FAILED", error: kind });
      }
    },
    [applyLevel, loadStatus],
  );

  const begin = useCallback(async () => {
    if (!targetLang || busy.current) {
      return;
    }
    busy.current = true;
    dispatch({ type: "START_REQUESTED" });
    try {
      const attempt = await startPlacement({ target_lang: targetLang, through_lang: throughLang });
      if (!alive.current) {
        return;
      }
      dispatch({ type: "START_SUCCEEDED", attempt });
      void tap("medium");
      if (isAttemptComplete(attempt)) {
        await finish(attempt.attempt_id);
      }
    } catch (caught) {
      if (alive.current) {
        dispatch({ type: "START_FAILED", error: placementErrorKind(caught) });
      }
    } finally {
      busy.current = false;
    }
  }, [finish, targetLang, throughLang]);

  const autoBegan = useRef(false);
  useEffect(() => {
    if (!startsAlone || !token || autoBegan.current) {
      return;
    }
    autoBegan.current = true;
    void begin();
  }, [begin, startsAlone, token]);

  const submit = useCallback(async () => {
    const snapshot = stateRef.current;
    const attempt: PlacementAttempt | null = snapshot.attempt;
    const item = currentItem(attempt);
    const choice = snapshot.picked;
    if (!attempt || !item || choice === null || busy.current) {
      return;
    }
    busy.current = true;
    dispatch({ type: "ANSWER_REQUESTED" });
    try {
      const step = await answerPlacement(attempt.attempt_id, item.id, choice);
      if (!alive.current) {
        return;
      }
      dispatch({ type: "ANSWER_SUCCEEDED", itemId: item.id, choice, step });
      void tap("light");
      const next = applyAnswer(attempt, item.id, choice, step);
      if (next.done) {
        await finish(attempt.attempt_id);
      }
    } catch (caught) {
      if (!alive.current) {
        return;
      }
      const kind = placementErrorKind(caught);
      if (kind === "closed") {
        dispatch({ type: "BACK_TO_STATUS" });
        void loadStatus();
        return;
      }
      if (isOutOfSync(caught)) {
        // A resposta já tinha chegado ao servidor: retoma a tentativa aberta onde ela está.
        busy.current = false;
        await begin();
        return;
      }
      dispatch({ type: "ANSWER_FAILED", error: kind });
    } finally {
      busy.current = false;
    }
  }, [begin, finish, loadStatus]);

  const pick = useCallback((choice: number) => {
    dispatch({ type: "PICKED", choice });
    void tap("light");
  }, []);

  const goHome = useCallback(() => {
    router.replace("/" as Href);
  }, []);

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as Href);
  }, []);

  const saveCanDo = useCallback(
    async (held: string[]) => {
      const current = getSession();
      const result = stateRef.current.result;
      if (!current || !result) {
        throw new Error("no-session");
      }
      await postProfileSignals(current.token, result.target_lang, canDoSignals(held, result.level));
    },
    [],
  );

  const done = useCallback(() => {
    const result = stateRef.current.result;
    if (!result) {
      return;
    }
    if (onFinished) {
      onFinished(toOutcome(result));
      return;
    }
    goHome();
  }, [goHome, onFinished]);

  // Teclado no web: 1–4 escolhem a opção, Enter confirma.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || state.phase !== "question") {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      const item = currentItem(stateRef.current.attempt);
      const digit = Number(event.key);
      if (item && Number.isInteger(digit) && digit >= 1 && digit <= item.options.length) {
        pick(digit - 1);
        return;
      }
      if (event.key === "Enter" && target?.tagName !== "BUTTON" && stateRef.current.picked !== null) {
        void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick, state.phase, submit]);

  if (!session) {
    return embedded ? null : <Redirect href={"/account" as Href} />;
  }

  const item = currentItem(state.attempt);

  let body: ReactNode = null;
  if (state.phase === "status") {
    body = (
      <StatusPanel
        t={t}
        bcp47={bcp47}
        targetLang={targetLang}
        throughLang={throughLang}
        fallbackLevel={userLevel}
        status={state.status}
        loading={state.statusLoading}
        error={state.statusError}
        starting={state.pending}
        onReload={() => void loadStatus()}
        onStart={() => void begin()}
        onHome={goHome}
      />
    );
  } else if (state.phase === "starting") {
    body = state.error ? (
      <PlacementNotice t={t} kind={state.error} onRetry={() => void begin()} busy={state.pending} testID="placement-start-error" />
    ) : (
      <LoadingLine label={t.preparing} detail={t.preparingSlow} testID="placement-preparing" />
    );
  } else if (state.phase === "question" && state.attempt && item) {
    body = (
      <Question
        t={t}
        attempt={state.attempt}
        item={item}
        targetLang={targetLang}
        picked={state.picked}
        pending={state.pending}
        error={state.error}
        onPick={pick}
        onSubmit={() => void submit()}
        onLeave={embedded ? undefined : leave}
      />
    );
  } else if (state.phase === "finishing") {
    const attemptId = state.attempt?.attempt_id;
    body = state.error ? (
      <PlacementNotice
        t={t}
        kind={state.error}
        onRetry={attemptId ? () => void finish(attemptId) : undefined}
        busy={state.pending}
        testID="placement-finish-error"
      />
    ) : (
      <LoadingLine label={t.computing} testID="placement-computing" />
    );
  } else if (state.phase === "result" && state.result) {
    body = (
      <Result
        t={t}
        locale={locale}
        bcp47={bcp47}
        result={state.result}
        embedded={embedded}
        onSaveCanDo={saveCanDo}
        onDone={done}
      />
    );
  }

  if (embedded) {
    return (
      <View className="w-full gap-5" testID="placement-screen">
        {body}
      </View>
    );
  }

  const showBack = state.phase === "status" || state.phase === "result";

  return (
    <ScrollView className="flex-1 bg-[#FDFBF7]" contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}>
      <View testID="placement-screen" className="w-full max-w-3xl gap-6 self-center px-4 py-6 md:px-8 md:py-10">
        <View className="flex-row items-center gap-4">
          {showBack ? (
            <TactileButton
              variant="secondary"
              size="sm"
              onPress={leave}
              icon={<Icon name="arrow-left" color="#111C2D" size={18} />}
              label={t.back}
            />
          ) : null}
          <View className="min-w-0 flex-1">
            <SectionLabel>{t.kicker}</SectionLabel>
            <Text accessibilityRole="header" className="font-sans text-3xl font-black tracking-tight text-[#111C2D]">
              {t.title}
            </Text>
          </View>
        </View>
        {body}
      </View>
    </ScrollView>
  );
}
