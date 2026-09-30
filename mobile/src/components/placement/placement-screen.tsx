import { Redirect, router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import {
  answerPlacement,
  fetchPlacementStatus,
  finishPlacement,
  postProfileSignals,
  speakStory,
  startPlacement,
  type PlacementAttempt,
  type PlacementFinish,
  type PlacementStatus,
} from "@/lib/api";
import { tap } from "@/lib/haptics";
import { getLocale, useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { narratorVoice } from "@/lib/narrator";
import { canDoFor, canDoScore } from "@/lib/can-do";
import { rememberSkills } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";
import { startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";

type Phase = "intro" | "loading" | "play" | "result" | "error";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function deltaLabel(copy: ReturnType<typeof useCopy>, previous: string | null, next: string): string {
  if (!previous || previous === next) {
    return copy.placeSame;
  }
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return order.indexOf(next) > order.indexOf(previous) ? copy.placeUp : copy.placeDown;
}

export function PlacementScreen() {
  const session = useSession();
  const copy = useCopy();
  const [phase, setPhase] = useState<Phase>("intro");
  const [status, setStatus] = useState<PlacementStatus | null>(null);
  const [attempt, setAttempt] = useState<PlacementAttempt | null>(null);
  const [result, setResult] = useState<PlacementFinish | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<string[]>([]);
  const [canDoSaved, setCanDoSaved] = useState(false);
  const playback = useRef<PlaybackHandle | null>(null);

  const loadStatus = useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      setStatus(await fetchPlacementStatus(session.token));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.placeFailed);
    }
  }, [copy.placeFailed, session]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const clip = phase === "play" && itemKind(attempt) === "listening" ? currentAudio(attempt) : undefined;
  const clipLang = session?.user.target_lang ?? "en";
  useEffect(() => {
    if (!clip) {
      return;
    }
    let stopped = false;
    void speakStory(clip, clipLang, narratorVoice(clipLang))
      .then((spoken) => {
        if (stopped) {
          return;
        }
        playback.current?.stop();
        playback.current = startNeuralPlayback(spoken.audioUrl, 1, () => undefined, () => undefined, () => undefined);
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
      playback.current?.stop();
    };
  }, [clip, clipLang]);

  if (!session) {
    return <Redirect href="/account" />;
  }

  const token = session.token;
  const user = session.user;
  const item = attempt?.items[attempt.index] ?? null;
  const total = attempt?.items.length ?? 0;
  const cap = attempt?.adaptive ? (attempt.cap ?? 24) : total;
  const lastQuestion = Boolean(attempt && !attempt.adaptive && attempt.index >= total - 1);

  async function begin() {
    setPending(true);
    setError(null);
    setPhase("loading");
    try {
      const next = await startPlacement(token, {
        target_lang: user.target_lang,
        through_lang: user.native_lang,
      });
      setAttempt(next);
      const current = next.items[next.index];
      setPicked(current ? (next.answered[current.id] ?? null) : null);
      setPhase("play");
      void tap("medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.placeFailed);
      setPhase("error");
    } finally {
      setPending(false);
    }
  }

  function choose(choice: number) {
    if (!attempt || !item || pending) {
      return;
    }
    setPicked(choice);
    void tap("light");
  }

  async function complete() {
    const finished = await finishPlacement(token, attempt?.attempt_id ?? "");
    rememberProfile({ level: finished.level as typeof user.level });
    if (finished.skills?.length) {
      rememberSkills(finished.skills);
      const signals = Object.fromEntries(
        finished.skills.flatMap((item) => {
          if (item.total <= 0) {
            return [];
          }
          const key = item.skill === "vocab" ? "vocabulary" : item.skill;
          return [[key, Math.round((item.correct / item.total) * 100)]];
        }),
      );
      if (Object.keys(signals).length > 0) {
        void postProfileSignals(token, finished.target_lang, signals).catch(() => undefined);
      }
    }
    setResult(finished);
    setHeld([]);
    setCanDoSaved(false);
    setPhase("result");
    await loadStatus();
    void tap("success");
  }

  async function replay(text: string) {
    const spoken = await speakStory(text, user.target_lang, narratorVoice(user.target_lang));
    playback.current?.stop();
    playback.current = startNeuralPlayback(spoken.audioUrl, 1, () => undefined, () => undefined, () => undefined);
  }

  async function forward() {
    if (!attempt || !item || picked === null || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const step = await answerPlacement(token, attempt.attempt_id, item.id, picked);
      if (attempt.adaptive) {
        if (step.done || !step.next) {
          await complete();
          return;
        }
        const items = [...attempt.items, step.next];
        setAttempt({
          ...attempt,
          items,
          index: items.length - 1,
          answered: { ...attempt.answered, [item.id]: picked },
          cap: step.cap,
        });
        setPicked(null);
        return;
      }
      if (lastQuestion) {
        await complete();
        return;
      }
      const nextIndex = attempt.index + 1;
      const nextItem = attempt.items[nextIndex];
      setAttempt({ ...attempt, index: nextIndex, answered: { ...attempt.answered, [item.id]: picked } });
      setPicked(nextItem ? (attempt.answered[nextItem.id] ?? null) : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.placeFailed);
    } finally {
      setPending(false);
    }
  }

  const target = user.target_lang;

  return (
    <AppFrame>
      {phase === "play" && attempt && item ? (
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-label text-sm text-ember">
              {attempt.adaptive
                ? fill(copy.placeLive, { n: attempt.index + 1 })
                : fill(copy.placeQuestion, { n: attempt.index + 1, total })}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-sand">
            <View className="h-full rounded-full bg-ember" style={{ width: `${((attempt.index + 1) / Math.max(1, cap)) * 100}%` }} />
          </View>
          <Text className="text-sm text-muted">{item.hint}</Text>
          {item.passage ? <Text className="text-base leading-7 text-ink">{item.passage}</Text> : null}
          {item.kind === "listening" && item.audio_text ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.placeListen}
              onPress={() => void replay(item.audio_text ?? "")}
              className="min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-ink px-5"
            >
              <Text className="font-label text-base text-ink">{copy.placeListen}</Text>
            </Pressable>
          ) : null}
          <Text className="font-displayItalic text-headline text-ink">{item.prompt}</Text>
          <View className="gap-2">
            {item.options.map((option, index) => {
              const selected = picked === index;
              return (
                <Pressable
                  key={`${item.id}-${index}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: pending }}
                  disabled={pending}
                  onPress={() => void choose(index)}
                  className={`min-h-14 cursor-pointer justify-center rounded-[20px] px-5 ${selected ? "bg-ember" : "border border-line bg-card"}`}
                >
                  <Text className={`text-base leading-6 ${selected ? "text-onEmber" : "text-ink"}`}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          {error ? (
            <Text accessibilityRole="alert" className="text-sm text-roseInk">
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={picked === null || pending}
            onPress={() => void forward()}
            className={`min-h-14 cursor-pointer items-center justify-center rounded-full ${picked === null ? "bg-line" : "bg-ink"}`}
          >
            <Text className="font-label text-base text-card">{lastQuestion ? copy.placeFinish : copy.placeNext}</Text>
          </Pressable>
        </View>
      ) : phase === "result" && result ? (
        <View className="gap-8">
          <PageMasthead
            kicker={copy.placeKicker}
            title={copy.placeResult}
            dek={fill(copy.placeScore, { score: result.score, correct: result.correct, total: result.total })}
          />
          <View className="flex-row flex-wrap items-end gap-6 rounded-[28px] border border-line bg-card px-6 py-7">
            <Flag code={result.target_lang} size={40} />
            <View className="min-w-0 flex-1">
              <Text className="font-label text-sm text-muted">{languageName(result.target_lang)}</Text>
              <Text className="font-displayItalic mt-1 text-display text-ink">{result.level}</Text>
              <Text className="mt-2 text-sm text-ember">{deltaLabel(copy, result.previous_level, result.level)}</Text>
            </View>
            <View>
              <Text className="font-label text-xs uppercase text-muted">{copy.placeWas}</Text>
              <Text className="mt-1 font-label text-xl text-ink">{result.previous_level}</Text>
            </View>
          </View>
          <CanDoList
            level={result.level}
            held={held}
            saved={canDoSaved}
            onToggle={(id) => {
              setHeld((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
              setCanDoSaved(false);
            }}
            onSave={() => {
              const token = session?.token;
              if (!token) {
                return;
              }
              const score = canDoScore(held, result.level);
              void postProfileSignals(token, result.target_lang, { writing: score, fluency: score }).then(() => {
                setCanDoSaved(true);
              }).catch(() => undefined);
            }}
          />
          {result.skills && result.skills.length > 0 ? (
            <View>
              <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.placeSkills}</Text>
              <View className="mt-3 gap-2">
                {result.skills.map((skill) => (
                  <View key={skill.skill} className="flex-row items-center gap-3">
                    <Text className="w-28 font-label text-sm text-ink">{skillName(copy, skill.skill)}</Text>
                    <View className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                      <View
                        className="h-full rounded-full bg-ember"
                        style={{ width: `${skill.total === 0 ? 0 : (skill.correct / skill.total) * 100}%` }}
                      />
                    </View>
                    <Text className="w-12 text-right text-sm text-muted">
                      {skill.correct}/{skill.total}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.placeBand}</Text>
            <View className="mt-3 gap-2">
              {result.bands.map((band) => (
                <View key={band.band} className="flex-row items-center gap-3">
                  <Text className="w-8 font-label text-sm text-ink">{band.band}</Text>
                  <View className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                    <View
                      className="h-full rounded-full bg-ember"
                      style={{ width: `${band.total === 0 ? 0 : (band.correct / band.total) * 100}%` }}
                    />
                  </View>
                  <Text className="w-12 text-right text-sm text-muted">
                    {band.correct}/{band.total}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <HistoryList entries={result.history} empty={copy.placeEmptyHistory} title={copy.placeHistory} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/" as Href)}
            className="min-h-14 cursor-pointer items-center justify-center rounded-full bg-ember"
          >
            <Text className="font-label text-base text-onEmber">{copy.navHome}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-8">
          <PageMasthead kicker={copy.placeKicker} title={copy.placeTitle} dek={copy.placeDek} />
          <View className="flex-row items-center gap-3 rounded-[24px] border border-line bg-card px-5 py-5">
            <Flag code={target} size={36} />
            <View className="min-w-0 flex-1">
              <Text className="font-label text-base text-ink">{languageName(target)}</Text>
              <Text className="text-sm text-muted">
                {status?.last?.result_level ?? user.level} · {languageName(user.native_lang)}
              </Text>
            </View>
          </View>
          <Text className="text-base leading-7 text-muted">
            {status?.last
              ? status.due
                ? copy.placeDue
                : fill(copy.placeWait, { days: status.days_until ?? 0 })
              : copy.placeNever}
          </Text>
          {phase === "loading" ? <Text className="text-base text-muted">{copy.placePreparing}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" className="text-sm text-roseInk">
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={() => void begin()}
            className="min-h-14 cursor-pointer items-center justify-center rounded-full bg-ember px-6"
          >
            <Text className="font-label text-base text-onEmber">
              {status?.open_attempt_id ? copy.placeContinue : status?.last ? copy.placeRetake : copy.placeStart}
            </Text>
          </Pressable>
          {status && status.history.length > 0 ? (
            <HistoryList entries={status.history} empty={copy.placeEmptyHistory} title={copy.placeHistory} />
          ) : null}
        </View>
      )}
    </AppFrame>
  );
}

function currentAudio(attempt: PlacementAttempt | null): string | undefined {
  const item = attempt?.items[attempt.index];
  return item?.audio_text;
}

function itemKind(attempt: PlacementAttempt | null): string | undefined {
  return attempt?.items[attempt.index]?.kind;
}

function skillName(copy: ReturnType<typeof useCopy>, skill: string): string {
  if (skill === "vocab") {
    return copy.placeVocab;
  }
  if (skill === "grammar") {
    return copy.placeGrammar;
  }
  if (skill === "listening") {
    return copy.placeListening;
  }
  return copy.placeReading;
}

function HistoryList({
  entries,
  empty,
  title,
}: {
  entries: PlacementStatus["history"];
  empty: string;
  title: string;
}) {
  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-muted">{title}</Text>
      {entries.length === 0 ? (
        <Text className="mt-3 text-sm text-muted">{empty}</Text>
      ) : (
        <View className="mt-3 gap-2">
          {entries.map((entry) => (
            <View key={entry.id} className="flex-row items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3">
              <View>
                <Text className="font-label text-base text-ink">{entry.result_level}</Text>
                <Text className="text-sm text-muted">{entry.finished_at.slice(0, 10)}</Text>
              </View>
              <Text className="font-label text-sm text-muted">{entry.score}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CanDoList({
  level,
  held,
  saved,
  onToggle,
  onSave,
}: {
  level: string;
  held: string[];
  saved: boolean;
  onToggle: (id: string) => void;
  onSave: () => void;
}) {
  const copy = useCopy();
  const locale = getLocale();
  const items = canDoFor(level);
  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.canDoTitle}</Text>
      <Text className="mt-2 text-base leading-7 text-muted">{copy.canDoHint}</Text>
      <View className="mt-3 gap-2">
        {items.map((item) => {
          const on = held.includes(item.id);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => onToggle(item.id)}
              className={`min-h-12 justify-center rounded-2xl border px-4 py-3 ${on ? "border-ember bg-emberSoft" : "border-line bg-paper"}`}
            >
              <Text className="text-base leading-6 text-ink">{item.text[locale]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" onPress={onSave} className="mt-4 min-h-12 items-center justify-center self-start rounded-full border border-line px-5">
        <Text className="text-base font-semibold text-ink">{saved ? copy.canDoSaved : copy.canDoSave}</Text>
      </Pressable>
    </View>
  );
}
