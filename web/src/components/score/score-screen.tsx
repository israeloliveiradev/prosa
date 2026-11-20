import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
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
import { TactilePage } from "@/features/shell/tactile-page";
import { TactileButton } from "@/components/tactile/tactile-button";
import { tactile } from "@/components/tactile/tokens";

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
    <TactilePage testID="score-screen" kicker={copy.scoreKicker} title={copy.scoreTitle} dek={phase === "intro" ? copy.scoreDek : undefined}>
        {error && phase !== "error" ? <Text className="text-base text-[#B45309]">{error}</Text> : null}

        {phase === "intro" ? (
          <View className="gap-4">
            {status?.latest ? (
              <View className="rounded-3xl border-2 border-[#E7E5E4] bg-white px-5 py-4">
                <Text className="font-display text-4xl font-extrabold text-[#111C2D]">{status.latest.score}</Text>
                <Text className="mt-1 text-base text-[#64748B]">{status.latest.band}</Text>
                {status.latest.share_token ? (
                  <Text className="mt-2 text-sm text-[#64748B]">{shareUrl(status.latest.share_token)}</Text>
                ) : null}
              </View>
            ) : (
              <Text className="text-base leading-7 text-[#64748B]">{copy.scoreNever}</Text>
            )}
            {wait ? (
              <Text className="text-base text-[#64748B]">{fill(copy.scoreWait, { days: status.days_until ?? 0 })}</Text>
            ) : status?.due && status.latest ? (
              <Text className="text-base text-[#64748B]">{copy.scoreDue}</Text>
            ) : null}
            {canStart ? (
              <TactileButton testID="score-start" label={status?.open_attempt_id ? copy.scoreContinue : copy.scoreStart} variant="primary" size="md" style={{ alignSelf: "flex-start" }} onPress={() => void begin()} disabled={pending} />
            ) : null}
          </View>
        ) : null}

        {phase === "item" && item ? (
          <View className="gap-4">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">
              {fill(copy.scoreLive, { n: asked + 1 })}
            </Text>
            {item.passage ? <Text className="text-lg leading-8 text-[#111C2D]">{item.passage}</Text> : null}
            <Text className="text-lg leading-7 text-[#111C2D]">{item.prompt}</Text>
            {item.audio_text ? (
              <TactileButton label={copy.examListen} variant="secondary" size="md" style={{ alignSelf: "flex-start" }} onPress={() => void hear(item)} />
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
                  className={`min-h-12 justify-center rounded-2xl border px-4 py-3 ${on ? "border-[#0F766E] bg-[#F0FDFA]" : "border-[#E7E5E4] bg-white"}`}
                >
                  <Text className="text-base leading-6 text-[#111C2D]">{option}</Text>
                </Pressable>
              );
            })}
            <TactileButton testID="score-next" label={copy.placeNext} variant="secondary" size="md" style={{ alignSelf: "flex-start" }} onPress={() => void forward()} disabled={picked === null || pending} />
          </View>
        ) : null}

        {phase === "write" && prompts ? (
          <View>
            <Text className="text-xs font-extrabold uppercase tracking-widest text-[#B45309]">{copy.examWrite}</Text>
            <Text className="mt-2 text-lg leading-8 text-[#111C2D]">{prompts.writing}</Text>
            <TextInput
              value={writing}
              onChangeText={setWriting}
              multiline
              textAlignVertical="top"
              accessibilityLabel={copy.examWrite}
              placeholderTextColor={tactile.faint}
              className="mt-4 min-h-40 rounded-2xl border-2 border-[#E7E5E4] bg-white px-5 py-4 text-lg leading-7 text-[#111C2D]"
            />
            <TactileButton testID="score-to-speak" label={copy.placeNext} variant="secondary" size="md" style={{ marginTop: 16, alignSelf: "flex-start" }} onPress={() => setPhase("speak")} disabled={writing.trim().length === 0} />
          </View>
        ) : null}

        {phase === "speak" && prompts ? (
          <View>
            <Text className="text-xs font-extrabold uppercase tracking-widest text-[#B45309]">{copy.examSpeak}</Text>
            <Text className="mt-2 text-lg leading-8 text-[#111C2D]">{prompts.speaking}</Text>
            <TextInput
              value={speaking}
              onChangeText={setSpeaking}
              multiline
              textAlignVertical="top"
              accessibilityLabel={copy.examSpeak}
              placeholderTextColor={tactile.faint}
              className="mt-4 min-h-32 rounded-2xl border-2 border-[#E7E5E4] bg-white px-5 py-4 text-lg leading-7 text-[#111C2D]"
            />
            <TactileButton testID="score-finish" label={copy.scoreFinish} variant="primary" size="md" style={{ marginTop: 16, alignSelf: "flex-start" }} onPress={() => void close()} disabled={pending || speaking.trim().length === 0} />
          </View>
        ) : null}

        {phase === "result" && result ? (
          <View className="gap-3">
            <Text className="font-display text-5xl font-extrabold text-[#111C2D]">{result.score}</Text>
            <Text className="text-base text-[#64748B]">{`${result.band} · ${languageName(result.target_lang)}`}</Text>
            {result.previous !== null ? <Text className="text-base text-[#64748B]">{`${copy.examWas} ${result.previous}`}</Text> : null}
            {result.held ? <Text className="text-base text-[#B45309]">{copy.scoreHeld}</Text> : null}
            {result.share_token ? (
              <View className="gap-2">
                <Text className="text-sm text-[#64748B]">{shareUrl(result.share_token)}</Text>
                <TactileButton label={copied ? copy.scoreCopied : copy.scoreCopy} variant="secondary" size="md" style={{ alignSelf: "flex-start" }} onPress={() => {
                    void writeClipboard(shareUrl(result.share_token ?? "")).then((ok) => {
                      if (ok) {
                        setCopied(true);
                      }
                    });
                  }} />
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === "error" ? <Text className="text-base leading-7 text-[#B45309]">{error}</Text> : null}
    </TactilePage>
  );
}
