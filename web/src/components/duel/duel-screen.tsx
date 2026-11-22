import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { fill } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { ErrorPanel, PracticePage } from "@/features/practice/components/practice-header";
import { applyAnswer, EMPTY_TALLY, unitParam, type DuelRoundData, type DuelTally } from "@/features/practice/model/duel-model";
import { queryClient } from "@/api/query-client";
import { fetchDuelBoard, fetchDuelRound, saveDuelScore, type DuelBoardEntry } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { DUEL } from "@/lib/copy/duel";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";

type Phase = "loading" | "error" | "ready" | "playing" | "done";
type SaveState = "saving" | "saved" | "failed";

/**
 * Duelo: rodada de 8 a 12 perguntas do servidor (/duel/round), pontos por combo, placar salvo em
 * /duel/score. Com `?unit=<id>` é a rodada-chefe da unidade. O melhor pessoal vem do servidor.
 */
export function DuelScreen() {
  const session = useSession();
  const t = useAreaCopy(DUEL);
  const params = useLocalSearchParams<{ unit?: string }>();
  const unitId = unitParam(params.unit);
  const token = session?.token;
  const [phase, setPhase] = useState<Phase>("loading");
  const [round, setRound] = useState<DuelRoundData | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [tally, setTally] = useState<DuelTally>(EMPTY_TALLY);
  const [save, setSave] = useState<SaveState>("saving");
  const [board, setBoard] = useState<DuelBoardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previousBest, setPreviousBest] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!token) {
      return;
    }
    setPhase("loading");
    setError(null);
    setRound(null);
    void fetchDuelRound(token, unitId)
      .then((next) => {
        setRound(next);
        setPreviousBest(next.best);
        setPhase("ready");
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : null);
        setPhase("error");
      });
  }, [token, unitId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    (final: DuelTally) => {
      if (!token) {
        return;
      }
      setSave("saving");
      void saveDuelScore(token, { score: final.score, best_combo: final.bestCombo, correct_count: final.correct, unit_id: unitId })
        .then(() => {
          setSave("saved");
          // O cartão do Duelo em /practice lê o recorde desta consulta (staleTime 60 s).
          void queryClient.invalidateQueries({ queryKey: ["duel-board"] });
          void fetchDuelBoard(token)
            .then(setBoard)
            .catch(() => setBoard(null));
        })
        .catch(() => setSave("failed"));
    },
    [token, unitId],
  );

  if (!session) {
    return <Redirect href="/account" />;
  }

  const drills = round?.drills ?? [];
  const drill = drills[index];
  const dek = unitId ? fill(t.dekUnit, { unit: unitId.toUpperCase() }) : t.dekFree;

  function answer(option: number) {
    if (!drill || picked !== null) {
      return;
    }
    const right = option === drill.answer;
    setPicked(option);
    setTally((current) => applyAnswer(current, right));
    void tap(right ? "success" : "heavy");
  }

  function next() {
    if (picked === null) {
      return;
    }
    if (index + 1 >= drills.length) {
      setPhase("done");
      persist(tally);
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  }

  function begin() {
    setTally(EMPTY_TALLY);
    setIndex(0);
    setPicked(null);
    setBoard(null);
    setPhase("playing");
  }

  function again() {
    setTally(EMPTY_TALLY);
    setIndex(0);
    setPicked(null);
    load();
  }

  let body;
  if (phase === "loading") {
    body = (
      <TactilePanel testID="duel-loading">
        <ActivityIndicator color={tactile.primary} />
        <Text accessibilityLiveRegion="polite" className="mt-2 text-base" style={{ color: tactile.muted }}>
          {t.loading}
        </Text>
      </TactilePanel>
    );
  } else if (phase === "error") {
    body = <ErrorPanel testID="duel-error" title={t.errorTitle} body={error ?? undefined} retry={t.retry} onRetry={load} />;
  } else if (phase === "ready" && round) {
    body = (
      <TactilePanel testID="duel-ready">
        <Text testID="duel-best" className="text-base font-extrabold" style={{ color: tactile.primaryInk }}>
          {round.best !== null ? fill(t.bestLine, { n: round.best }) : t.noBest}
        </Text>
        {round.focus.length > 0 ? (
          <Text className="mt-2 text-base leading-6" style={{ color: tactile.body }}>
            {fill(t.focusLine, { items: round.focus.join(", ") })}
          </Text>
        ) : null}
        <View className="mt-4 self-start">
          <TactileButton testID="duel-start" label={t.start} variant="primary" size="lg" onPress={begin} />
        </View>
      </TactilePanel>
    );
  } else if (phase === "playing" && drill) {
    body = (
      <View testID="duel-round" className="gap-4">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text testID="duel-progress" className="text-sm font-bold" style={{ color: tactile.muted }}>
            {fill(t.progress, { n: index + 1, total: drills.length })}
          </Text>
          <Text testID="duel-score" className="text-sm font-extrabold" style={{ color: tactile.primaryInk }}>
            {`${t.scoreLabel} ${tally.score} · ${t.comboLabel} ${tally.combo}`}
          </Text>
        </View>
        <TactilePanel>
          <Text testID="duel-prompt" className="font-display text-2xl font-extrabold leading-9" style={{ color: tactile.ink }}>
            {drill.prompt}
          </Text>
        </TactilePanel>
        <View className="gap-3">
          {drill.options.map((option, optionIndex) => {
            const isAnswer = optionIndex === drill.answer;
            const chosen = picked === optionIndex;
            const revealed = picked !== null;
            const bg = revealed && isAnswer ? tactile.successSoft : revealed && chosen ? tactile.dangerSoft : tactile.surface;
            const edge = revealed && isAnswer ? tactile.success : revealed && chosen ? tactile.danger : tactile.border;
            return (
              <Pressable
                key={`${index}-${optionIndex}`}
                testID={`duel-option-${optionIndex}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: revealed, selected: chosen }}
                disabled={revealed}
                onPress={() => answer(optionIndex)}
                className="min-h-14 cursor-pointer justify-center rounded-2xl border-2 px-5 py-3"
                style={{ backgroundColor: bg, borderColor: edge, borderBottomWidth: 4 }}
              >
                <Text className="text-lg font-semibold leading-7" style={{ color: tactile.ink }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {picked !== null ? (
          <View className="flex-row flex-wrap items-center gap-3">
            <Text accessibilityLiveRegion="polite" testID="duel-feedback" className="text-base font-extrabold" style={{ color: picked === drill.answer ? tactile.success : tactile.danger }}>
              {picked === drill.answer ? t.right : t.wrong}
            </Text>
            <TactileButton testID="duel-next" label={index + 1 >= drills.length ? t.finish : t.next} variant="primary" onPress={next} />
          </View>
        ) : null}
      </View>
    );
  } else if (phase === "done") {
    const beatBest = tally.score > 0 && (previousBest === null || tally.score > previousBest);
    body = (
      <View testID="duel-done" className="gap-4">
        <TactilePanel tone="accent">
          <Text className="font-display text-2xl font-extrabold" style={{ color: tactile.ink }}>
            {t.resultTitle}
          </Text>
          <Text testID="duel-result" className="mt-2 text-lg leading-7" style={{ color: tactile.ink }}>
            {fill(t.resultLine, { score: tally.score, correct: tally.correct, total: drills.length, combo: tally.bestCombo })}
          </Text>
          {beatBest && save === "saved" ? (
            <Text testID="duel-new-best" className="mt-2 text-base font-extrabold" style={{ color: tactile.success }}>
              {t.newBest}
            </Text>
          ) : null}
          <Text accessibilityLiveRegion="polite" testID="duel-save" className="mt-2 text-sm font-semibold" style={{ color: save === "failed" ? tactile.danger : tactile.muted }}>
            {save === "saving" ? t.saving : save === "saved" ? t.saved : t.saveFailed}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-3">
            {save === "failed" ? <TactileButton testID="duel-save-retry" label={t.saveRetry} variant="crimson" onPress={() => persist(tally)} /> : null}
            <TactileButton testID="duel-again" label={t.again} variant="primary" onPress={again} />
            <TactileButton testID="duel-back" label={t.back} variant="secondary" onPress={() => router.push("/practice")} />
          </View>
        </TactilePanel>
        <TactilePanel tone="quiet">
          <Text className="text-xs font-extrabold uppercase tracking-wider" style={{ color: tactile.primaryInk }}>
            {t.boardTitle}
          </Text>
          {board && board.length > 0 ? (
            board.slice(0, 10).map((entry, rank) => (
              <View key={`${entry.label}-${rank}`} className="mt-2 flex-row justify-between gap-3">
                <Text className="flex-1 text-base" style={{ color: tactile.ink, fontWeight: entry.you ? "800" : "500" }}>
                  {`${rank + 1}. ${entry.you ? t.boardYou : entry.label}`}
                </Text>
                <Text className="text-base font-bold" style={{ color: tactile.ink }}>
                  {entry.score}
                </Text>
              </View>
            ))
          ) : (
            <Text className="mt-2 text-base" style={{ color: tactile.muted }}>
              {t.boardEmpty}
            </Text>
          )}
        </TactilePanel>
      </View>
    );
  }

  return (
    <PracticePage testID="duel-screen" kicker={t.kicker} title={t.title} dek={dek} back="←">
      {body}
    </PracticePage>
  );
}
