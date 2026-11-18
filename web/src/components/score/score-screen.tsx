import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import {
  answerScore,
  fetchScoreStatus,
  finishScore,
  speakStory,
  startScore,
  type PlacementItem,
  type ScoreAttempt,
  type ScoreFinish,
  type ScoreStatus,
} from "@/lib/api";
import { writeClipboard } from "@/lib/clipboard";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { useTheme } from "@/theme/ThemeContext";

type Phase = "intro" | "item" | "write" | "speak" | "result" | "error";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function shareUrl(token: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/cert/${token}`;
  }
  return `/cert/${token}`;
}

export function ScoreScreen() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
  const throughLang = session?.user?.native_lang ?? "pt";
  const [phase, setPhase] = useState<Phase>("intro");
  const [status, setStatus] = useState<ScoreStatus | null>(null);
  const [attempt, setAttempt] = useState<ScoreAttempt | null>(null);
  const [item, setItem] = useState<PlacementItem | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [asked, setAsked] = useState(0);
  const [writing, setWriting] = useState("");
  const [speaking, setSpeaking] = useState("");
  const [prompts, setPrompts] = useState<{ writing: string; speaking: string } | null>(null);
  const [result, setResult] = useState<ScoreFinish | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const startedAt = useRef(Date.now());
  const playback = useRef<PlaybackHandle | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    void fetchScoreStatus(token, targetLang)
      .then((next) => {
        if (active) {
          setStatus(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : copy.scoreNever);
          setPhase("error");
        }
      });
    return () => {
      active = false;
      playback.current?.stop();
    };
  }, [token, targetLang, copy.scoreNever]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;

  async function begin() {
    setPending(true);
    setError(null);
    try {
      const next = await startScore(auth, { target_lang: targetLang, through_lang: throughLang });
      setAttempt(next);
      setAsked(Object.keys(next.answered).length);
      const current = next.items[next.index] ?? null;
      setItem(current);
      setPicked(null);
      setWriting("");
      setSpeaking("");
      setResult(null);
      setCopied(false);
      startedAt.current = Date.now();
      if (next.produce && next.prompts) {
        setPrompts(next.prompts);
        setPhase("write");
      } else {
        setPhase("item");
      }
      void tap("medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.scoreNever);
    } finally {
      setPending(false);
    }
  }

  async function hear(clip: PlacementItem) {
    if (!clip.audio_text) {
      return;
    }
    const spoken = await speakStory(clip.audio_text, targetLang, narratorVoice(targetLang));
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
      const elapsed = Date.now() - startedAt.current;
      const step = await answerScore(auth, attempt.attempt_id, item.id, picked, elapsed);
      setAsked(step.asked);
      setPicked(null);
      startedAt.current = Date.now();
      if (step.done) {
        setPrompts(step.prompts);
        setItem(null);
        setPhase("write");
      } else if (step.next) {
        setItem(step.next);
        setAttempt({
          ...attempt,
          items: [...attempt.items, step.next],
          index: attempt.items.length,
        });
      }
      void tap("light");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.scoreNever);
    } finally {
      setPending(false);
    }
  }

  async function close() {
    if (!attempt || pending) {
      return;
    }
    if (writing.trim().length === 0 || speaking.trim().length === 0) {
      return;
    }
    setPending(true);
    playback.current?.stop();
    try {
      const done = await finishScore(auth, attempt.attempt_id, writing.trim(), speaking.trim());
      setResult(done);
      setPhase("result");
      const refreshed = await fetchScoreStatus(auth, targetLang);
      setStatus(refreshed);
      void tap("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.scoreNever);
      setPhase("error");
    } finally {
      setPending(false);
    }
  }

  const wait = status && !status.due && status.days_until && status.days_until > 0;
  const canStart = Boolean(status?.due || status?.open_attempt_id);

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead
          kicker={copy.scoreKicker}
          title={copy.scoreTitle}
          dek={phase === "intro" ? copy.scoreDek : undefined}
        />
        {error && phase !== "error" ? <Text className="text-base text-ember">{error}</Text> : null}

        {phase === "intro" ? (
          <View className="gap-4">
            {status?.latest ? (
              <View className="rounded-3xl border border-line bg-card px-5 py-4">
                <Text className="font-displayItalic text-headline text-ink">{status.latest.score}</Text>
                <Text className="mt-1 text-base text-muted">{status.latest.band}</Text>
                {status.latest.share_token ? (
                  <Text className="mt-2 text-sm text-muted">{shareUrl(status.latest.share_token)}</Text>
                ) : null}
              </View>
            ) : (
              <Text className="text-base leading-7 text-muted">{copy.scoreNever}</Text>
            )}
            {wait ? (
              <Text className="text-base text-muted">{fill(copy.scoreWait, { days: status.days_until ?? 0 })}</Text>
            ) : status?.due && status.latest ? (
              <Text className="text-base text-muted">{copy.scoreDue}</Text>
            ) : null}
            {canStart ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void begin()}
                disabled={pending}
                className="min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
              >
                <Text className="text-base font-semibold text-paper">
                  {status?.open_attempt_id ? copy.scoreContinue : copy.scoreStart}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {phase === "item" && item ? (
          <View className="gap-4">
            <Text className="font-label text-xs uppercase tracking-widest text-muted">
              {fill(copy.scoreLive, { n: asked + 1 })}
            </Text>
            {item.passage ? <Text className="text-lg leading-8 text-ink">{item.passage}</Text> : null}
            <Text className="text-lg leading-7 text-ink">{item.prompt}</Text>
            {item.audio_text ? (
              <Pressable accessibilityRole="button" onPress={() => void hear(item)} className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5">
                <Text className="text-base font-semibold text-ink">{copy.examListen}</Text>
              </Pressable>
            ) : null}
            {item.options.map((option, optionIndex) => {
              const on = picked === optionIndex;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    setPicked(optionIndex);
                    void tap("light");
                  }}
                  className={`min-h-12 justify-center rounded-2xl border px-4 py-3 ${on ? "border-ember bg-emberSoft" : "border-line bg-paper"}`}
                >
                  <Text className="text-base leading-6 text-ink">{option}</Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => void forward()}
              disabled={picked === null || pending}
              className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.placeNext}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "write" && prompts ? (
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.examWrite}</Text>
            <Text className="mt-2 text-lg leading-8 text-ink">{prompts.writing}</Text>
            <TextInput
              value={writing}
              onChangeText={setWriting}
              multiline
              textAlignVertical="top"
              accessibilityLabel={copy.examWrite}
              placeholderTextColor={palette.onSurfaceVariant}
              className="mt-4 min-h-40 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPhase("speak")}
              disabled={writing.trim().length === 0}
              className="mt-4 min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.placeNext}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "speak" && prompts ? (
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.examSpeak}</Text>
            <Text className="mt-2 text-lg leading-8 text-ink">{prompts.speaking}</Text>
            <TextInput
              value={speaking}
              onChangeText={setSpeaking}
              multiline
              textAlignVertical="top"
              accessibilityLabel={copy.examSpeak}
              placeholderTextColor={palette.onSurfaceVariant}
              className="mt-4 min-h-32 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void close()}
              disabled={pending || speaking.trim().length === 0}
              className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
            >
              <Text className="text-base font-semibold text-paper">{copy.scoreFinish}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "result" && result ? (
          <View className="gap-3">
            <Text className="font-displayItalic text-display text-ink">{result.score}</Text>
            <Text className="text-base text-muted">{`${result.band} · ${languageName(result.target_lang)}`}</Text>
            {result.previous !== null ? <Text className="text-base text-muted">{`${copy.examWas} ${result.previous}`}</Text> : null}
            {result.held ? <Text className="text-base text-ember">{copy.scoreHeld}</Text> : null}
            {result.share_token ? (
              <View className="gap-2">
                <Text className="text-sm text-muted">{shareUrl(result.share_token)}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void writeClipboard(shareUrl(result.share_token ?? "")).then((ok) => {
                      if (ok) {
                        setCopied(true);
                      }
                    });
                  }}
                  className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
                >
                  <Text className="text-base font-semibold text-ink">{copied ? copy.scoreCopied : copy.scoreCopy}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === "error" ? <Text className="text-base leading-7 text-ember">{error}</Text> : null}
      </View>
    </AppFrame>
  );
}
