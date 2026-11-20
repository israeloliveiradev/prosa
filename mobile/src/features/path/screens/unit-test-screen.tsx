import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { finishCheckpoint, finishUnitTest, pathKeys, startCheckpoint, startUnitTest } from "@/api/path";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { asLevel } from "@/features/home/model/home-model";
import { CanDoList } from "@/features/path/components/path-parts";
import { TestQuestion } from "@/features/path/components/test-question";
import { findUnit, isUnitId, pathErrorKind, type PathErrorKind } from "@/features/path/model/path-model";
import {
  INITIAL_TEST_FLOW,
  allAnswered,
  answeredCount,
  answersPayload,
  parseStoredTest,
  testFlowReducer,
  type TestAttempt,
  type TestMode,
  type TestResult,
} from "@/features/path/model/test-flow";
import { usePath } from "@/features/path/model/use-path";
import { shellLayoutFor } from "@/features/shell/model/shell-model";
import { useAreaCopy } from "@/lib/copy/area";
import { PATH_COPY, type PathCopy } from "@/lib/copy/path";
import { tap } from "@/lib/haptics";
import { kv } from "@/lib/kv";
import { refreshSession, rememberProfile, useSession } from "@/lib/session";

const STORE_PREFIX = "prosa.path-test.v1";

function errorText(kind: PathErrorKind, mode: TestMode, t: PathCopy): string {
  switch (kind) {
    case "not-available":
      return mode === "unit" ? t.errNotAvailable : t.errCheckpointNotAvailable;
    case "not-ready":
      return t.errNotReady;
    case "expired":
      return t.errExpired;
    case "offline":
      return t.errOffline;
    case "slow":
      return t.errSlow;
    case "session":
      return t.errSession;
    default:
      return t.errUnknown;
  }
}

/**
 * Teste da unidade (mode "unit", ?unit=<id>) e checkpoint da banda (mode "checkpoint"):
 * começar → 8 perguntas, uma por vez → terminar → resultado (nota, se passou e o que abriu).
 * As respostas ficam no aparelho até o fim (sobrevivem ao F5); o gabarito só existe no servidor.
 */
export function UnitTestScreen({ mode }: { mode: TestMode }) {
  const t = useAreaCopy(PATH_COPY);
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ unit?: string }>();
  const { width } = useWindowDimensions();
  const phone = shellLayoutFor(width) === "phone";
  const path = usePath();
  const [state, dispatch] = useReducer(testFlowReducer, INITIAL_TEST_FLOW);
  const startedAt = useRef(0);
  const currentLevel = session?.user.level ?? "";
  const levelBefore = useRef(currentLevel);

  const unitId = mode === "unit" && isUnitId(params.unit) ? params.unit.trim() : null;
  const unit = findUnit(path.data, unitId);
  const unitBand = unit?.band ?? null;
  const target = session?.user.target_lang ?? "";
  const storeKey = session && target && (mode === "checkpoint" || unitId) ? `${STORE_PREFIX}:${session.user.id}:${target}:${mode === "unit" ? unitId : "checkpoint"}` : null;
  const checkpointBand = state.attempt?.band ?? path.data?.checkpoint?.band ?? null;

  /* Retoma a tentativa guardada (F5 ou saída no meio). */
  useEffect(() => {
    if (!storeKey) {
      return;
    }
    const stored = parseStoredTest(kv.getString(storeKey));
    if (stored) {
      startedAt.current = stored.savedAt;
      dispatch({ type: "RESTORED", attempt: stored.attempt, answers: stored.answers, index: stored.index });
    }
  }, [storeKey]);

  /* Guarda as respostas enquanto o teste está aberto. */
  useEffect(() => {
    if (!storeKey || !state.attempt || (state.phase !== "answering" && state.phase !== "sending")) {
      return;
    }
    try {
      kv.set(storeKey, JSON.stringify({ attempt: state.attempt, answers: state.answers, index: state.index, savedAt: startedAt.current || Date.now() }));
    } catch {
      // Sem armazenamento: o teste segue só em memória.
    }
  }, [state.answers, state.attempt, state.index, state.phase, storeKey]);

  function forget() {
    if (storeKey) {
      try {
        kv.delete(storeKey);
      } catch {
        // nada a apagar
      }
    }
  }

  async function start() {
    if (mode === "unit" && !unitId) {
      return;
    }
    dispatch({ type: "START_REQUESTED" });
    levelBefore.current = currentLevel;
    try {
      let attempt: TestAttempt;
      if (mode === "unit" && unitId) {
        const response = await startUnitTest(unitId);
        attempt = { attemptId: response.attempt_id, band: unitBand, items: response.items };
      } else {
        const response = await startCheckpoint();
        attempt = { attemptId: response.attempt_id, band: response.band, items: response.items };
      }
      startedAt.current = Date.now();
      dispatch({ type: "START_SUCCEEDED", attempt });
    } catch (error) {
      dispatch({ type: "START_FAILED", kind: pathErrorKind(error, "start") });
    }
  }

  async function finish() {
    if (!state.attempt || !allAnswered(state)) {
      return;
    }
    const answers = answersPayload(state);
    const attemptId = state.attempt.attemptId;
    dispatch({ type: "FINISH_REQUESTED" });
    try {
      let result: TestResult;
      if (mode === "unit" && unitId) {
        result = { mode: "unit", data: await finishUnitTest(unitId, attemptId, answers) };
      } else {
        const data = await finishCheckpoint(attemptId, answers);
        result = { mode: "checkpoint", data };
        const level = asLevel(data.level);
        if (level && level !== currentLevel) {
          rememberProfile({ level });
        }
        void refreshSession();
      }
      forget();
      void queryClient.invalidateQueries({ queryKey: pathKeys.all });
      void tap(result.data.passed ? "success" : "medium");
      dispatch({ type: "FINISH_SUCCEEDED", result });
    } catch (error) {
      const kind = pathErrorKind(error, "finish");
      if (kind === "expired") {
        forget();
      }
      dispatch({ type: "FINISH_FAILED", kind });
    }
  }

  const item = state.attempt?.items[state.index] ?? null;
  const total = state.attempt?.items.length ?? 0;
  const picked = item ? (state.answers[item.id] ?? null) : null;
  const isLast = state.index >= total - 1;
  const ready = allAnswered(state);

  /* Teclado no web: 1–4 escolhem, Enter avança ou termina. */
  const keyState = useRef({ state, item, isLast, ready, finish });
  useEffect(() => {
    keyState.current = { state, item, isLast, ready, finish };
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const current = keyState.current;
      if (current.state.phase !== "answering" || !current.item) {
        return;
      }
      const element = event.target as HTMLElement | null;
      if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "BUTTON")) {
        return;
      }
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= current.item.options.length) {
        dispatch({ type: "PICK", choice: digit - 1 });
        return;
      }
      if (event.key === "Enter") {
        if (!current.isLast && current.state.answers[current.item.id] !== undefined) {
          dispatch({ type: "GO", index: current.state.index + 1 });
        } else if (current.isLast && current.ready) {
          void current.finish();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!session) {
    return null;
  }

  const backToPath = () => router.replace("/path" as Href);
  const kicker = mode === "unit" ? t.testKicker : t.checkpointKicker(checkpointBand ?? "");
  const required = unit?.mastery.test.required ?? null;
  const unknownUnit = mode === "unit" && (!unitId || (path.isSuccess && !unit));
  const pathSaysClosed =
    mode === "unit" ? Boolean(unit && (unit.status !== "active" || !unit.mastery.test.available)) : Boolean(path.data?.checkpoint && !path.data.checkpoint.available);

  let body: ReactNode;
  if (state.phase === "result" && state.result) {
    body = <ResultView result={state.result} t={t} required={required} nextTitle={state.result.mode === "unit" ? (findUnit(path.data, state.result.data.next_unit_id)?.title ?? null) : null} levelBefore={levelBefore.current} onBack={backToPath} />;
  } else if (state.phase === "answering" || state.phase === "sending") {
    body = item ? (
      <View style={{ gap: 18 }}>
        <TestQuestion t={t} item={item} number={state.index + 1} total={total} targetLang={target} picked={picked} disabled={state.phase === "sending"} onPick={(choice) => dispatch({ type: "PICK", choice })} />
        {state.error ? (
          <Text testID="path-test-error" accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 14, lineHeight: 20, fontWeight: "700", color: tactile.danger }}>
            {errorText(state.error.kind, mode, t)}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <TactileButton
            testID="path-test-previous"
            label={t.previous}
            variant="ghost"
            size="md"
            disabled={state.index === 0 || state.phase === "sending"}
            onPress={() => dispatch({ type: "GO", index: state.index - 1 })}
            icon={<TactileIcon name="arrowLeft" size={16} color={tactile.primaryInk} />}
          />
          <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.muted }}>{`${answeredCount(state)}/${total}`}</Text>
          {isLast ? (
            <TactileButton
              testID="path-test-finish"
              label={state.phase === "sending" ? t.sending : t.finish}
              size="lg"
              disabled={!ready || state.phase === "sending"}
              onPress={() => void finish()}
              icon={state.phase === "sending" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <TactileIcon name="check" size={16} color="#FFFFFF" strokeWidth={3} />}
            />
          ) : (
            <TactileButton
              testID="path-test-next"
              label={t.next}
              size="lg"
              disabled={picked === null}
              onPress={() => dispatch({ type: "GO", index: state.index + 1 })}
              rightIcon={<TactileIcon name="arrowRight" size={16} color="#FFFFFF" />}
            />
          )}
        </View>
      </View>
    ) : null;
  } else if (state.phase === "error" && state.error) {
    body = (
      <TactilePanel testID="path-test-start-error" style={{ borderColor: "#FECACA" }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <TactileIcon name={state.error.kind === "not-available" ? "lock" : "alert"} size={20} color={state.error.kind === "not-available" ? tactile.amber : tactile.danger} />
          <Text accessibilityRole="alert" style={{ flex: 1, fontFamily: tactile.font, fontSize: 15, lineHeight: 22, fontWeight: "600", color: tactile.ink }}>
            {errorText(state.error.kind, mode, t)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <TactileButton testID="path-test-back" label={t.backToPath} size="md" onPress={backToPath} />
          {state.error.kind !== "not-available" && state.error.kind !== "session" ? <TactileButton label={t.tryAgainTest} variant="secondary" size="md" onPress={() => void start()} /> : null}
        </View>
      </TactilePanel>
    );
  } else if (unknownUnit) {
    body = (
      <TactilePanel testID="path-test-unknown">
        <Text style={{ fontFamily: tactile.font, fontSize: 15, color: tactile.body }}>{t.unknownUnit}</Text>
        <View style={{ alignSelf: "flex-start" }}>
          <TactileButton label={t.backToPath} size="md" onPress={backToPath} />
        </View>
      </TactilePanel>
    );
  } else {
    const starting = state.phase === "starting";
    body = (
      <TactilePanel testID="path-test-intro" tone="accent" padding={phone ? 18 : 24}>
        <PanelKicker icon="target">{kicker}</PanelKicker>
        <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: tactile.serif, fontSize: phone ? 26 : 32, lineHeight: phone ? 32 : 38, fontWeight: "600", color: tactile.ink }}>
          {mode === "unit" ? (unit?.title ?? "…") : t.checkpointTitle(checkpointBand ?? "")}
        </Text>
        {mode === "unit" && unit ? <CanDoList items={unit.can_do} compact /> : null}
        <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body }}>
          {mode === "unit" ? (required !== null ? t.testIntro(Math.round(required)) : null) : t.checkpointIntro}
        </Text>
        <Text style={{ fontFamily: tactile.font, fontSize: 13, lineHeight: 19, color: tactile.muted }}>{t.answersPrivate}</Text>
        {pathSaysClosed ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 14, backgroundColor: tactile.amberSoft, borderWidth: 1, borderColor: "#FDE68A" }}>
            <TactileIcon name="lock" size={16} color={tactile.amber} />
            <Text testID="path-test-closed" style={{ flex: 1, fontFamily: tactile.font, fontSize: 13, lineHeight: 19, fontWeight: "600", color: tactile.amber }}>
              {mode === "unit" ? t.errNotAvailable : t.errCheckpointNotAvailable}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <TactileButton
            testID="path-test-start"
            label={starting ? t.starting : t.start}
            size="lg"
            disabled={starting}
            fullWidth={phone}
            onPress={() => void start()}
            icon={starting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <TactileIcon name="play" size={16} color="#FFFFFF" fill="#FFFFFF" />}
          />
        </View>
      </TactilePanel>
    );
  }

  return (
    <View testID={mode === "unit" ? "unit-test-screen" : "checkpoint-screen"} style={{ flex: 1, backgroundColor: tactile.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: phone ? 16 : 28, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tactile.border, backgroundColor: tactile.surface }}>
        <Pressable
          testID="path-test-leave"
          accessibilityRole="button"
          accessibilityLabel={t.leave}
          onPress={backToPath}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12, cursor: "pointer" } as object}
        >
          <TactileIcon name="close" size={18} color={tactile.body} />
          <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: tactile.body }}>{t.leave}</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: tactile.primaryInk, textAlign: "right" }}>
            {mode === "unit" && unit ? `${kicker} · ${unit.title}` : kicker}
          </Text>
          {state.phase === "answering" ? <Text style={{ fontFamily: tactile.font, fontSize: 12, color: tactile.muted, textAlign: "right" }}>{t.leaveNote}</Text> : null}
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: "100%", maxWidth: 720, marginHorizontal: "auto", paddingHorizontal: phone ? 16 : 28, paddingTop: phone ? 18 : 32, paddingBottom: 40, gap: 18 } as object}>
          {body}
        </View>
      </ScrollView>
    </View>
  );
}

function ResultView({
  result,
  t,
  required,
  nextTitle,
  levelBefore,
  onBack,
}: {
  result: TestResult;
  t: PathCopy;
  required: number | null;
  nextTitle: string | null;
  levelBefore: string;
  onBack: () => void;
}) {
  const { score, passed } = result.data;
  const pct = Math.round(score);
  const need = result.mode === "unit" ? (result.data.unit?.mastery.test.required ?? required) : null;
  const lines: string[] = [];
  if (result.mode === "unit") {
    const data = result.data;
    if (passed) {
      if (data.unit && data.unit.status === "mastered") {
        lines.push(nextTitle ? t.resultUnlocked(nextTitle) : t.resultMastered);
      } else {
        lines.push(t.resultNotYet);
      }
    } else {
      if (need !== null) {
        lines.push(t.resultNeed(Math.round(need)));
      }
      lines.push(t.resultFailedHint);
    }
  } else {
    const level = result.data.level;
    lines.push(level && level !== levelBefore ? t.resultLevel(level) : t.resultLevelSame(level));
  }

  return (
    <TactilePanel testID="path-test-result" tone={passed ? "accent" : "plain"} padding={24} style={{ gap: 16, alignItems: "flex-start" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: passed ? tactile.success : tactile.raised,
            borderWidth: 3,
            borderColor: passed ? "#065F46" : tactile.borderStrong,
            boxShadow: `0 4px 0 ${passed ? "#065F46" : tactile.borderStrong}`,
          } as object}
        >
          <Text testID="path-test-score" style={{ fontFamily: tactile.font, fontSize: 26, fontWeight: "800", color: passed ? "#FFFFFF" : tactile.ink }}>{`${pct}%`}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text testID="path-test-verdict" accessibilityRole="header" style={{ fontFamily: tactile.serif, fontSize: 28, lineHeight: 34, fontWeight: "600", color: tactile.ink }}>
            {passed ? t.passed : t.failed}
          </Text>
          {result.mode === "unit" ? (
            <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "700", color: tactile.body }}>{t.resultCorrect(result.data.correct, result.data.total)}</Text>
          ) : null}
        </View>
      </View>
      {lines.map((line) => (
        <Text key={line} testID="path-test-result-line" style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body }}>
          {line}
        </Text>
      ))}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <TactileButton testID="path-test-back" label={t.backToPath} size="lg" onPress={onBack} icon={<TactileIcon name="route" size={16} color="#FFFFFF" />} />
      </View>
    </TactilePanel>
  );
}
