import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import {
  chooseExam,
  fetchExamMock,
  fetchExamStatus,
  finishExam,
  speakStory,
  type ExamChoiceItem,
  type ExamFinish,
  type ExamMock,
  type ExamStatus,
} from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { useTheme } from "@/theme/ThemeContext";

type Phase = "pick" | "item" | "write" | "speak" | "result" | "error";

export function ExamScreen() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
  const token = session?.token;
  const targetLang = session?.user.target_lang ?? "en";
  const [phase, setPhase] = useState<Phase>("pick");
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [mock, setMock] = useState<ExamMock | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [writing, setWriting] = useState("");
  const [speaking, setSpeaking] = useState("");
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<ExamFinish | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endsAt = useRef(0);
  const startedAt = useRef(0);
  const playback = useRef<PlaybackHandle | null>(null);
  const finishing = useRef(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    void fetchExamStatus(token, targetLang)
      .then((next) => {
        if (active) {
          setStatus(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : copy.examEmpty);
          setPhase("error");
        }
      });
    return () => {
      active = false;
      playback.current?.stop();
    };
  }, [token, targetLang, copy.examEmpty]);

  useEffect(() => {
    if (phase === "pick" || phase === "result" || phase === "error") {
      return;
    }
    const timer = setInterval(() => {
      const remain = Math.max(0, endsAt.current - Date.now());
      setLeft(remain);
      if (remain === 0 && token && mock && !finishing.current) {
        void close(token, mock, answers, writing, speaking);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [phase, token, mock, answers, writing, speaking]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;
  const item = mock?.items[index] ?? null;

  async function pickTrack(examId: string) {
    setPending(true);
    setError(null);
    try {
      const next = await chooseExam(auth, targetLang, examId);
      setStatus(next);
      void tap("medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.examEmpty);
    } finally {
      setPending(false);
    }
  }

  async function begin() {
    const examId = status?.track;
    if (!examId) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await fetchExamMock(auth, targetLang, examId);
      setMock(next);
      setIndex(0);
      setPicked(null);
      setAnswers({});
      setWriting("");
      setSpeaking("");
      setResult(null);
      startedAt.current = Date.now();
      endsAt.current = Date.now() + next.seconds * 1000;
      setLeft(next.seconds * 1000);
      finishing.current = false;
      setPhase("item");
      void tap("medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.examEmpty);
    } finally {
      setPending(false);
    }
  }

  async function hear(clip: ExamChoiceItem) {
    if (!clip.audio) {
      return;
    }
    const spoken = await speakStory(clip.audio, targetLang, narratorVoice(targetLang));
    playback.current?.stop();
    playback.current = startNeuralPlayback(spoken.audioUrl, 1, () => undefined, () => undefined, () => undefined);
  }

  function keepChoice(option: number) {
    if (!item) {
      return;
    }
    setPicked(option);
    setAnswers((current) => ({ ...current, [item.id]: option }));
    void tap("light");
  }

  function nextItem() {
    if (!mock || picked === null) {
      return;
    }
    if (index + 1 >= mock.items.length) {
      setPhase("write");
      return;
    }
    setIndex((current) => current + 1);
    setPicked(null);
  }

  async function close(
    auth: string,
    current: ExamMock,
    held: Record<string, number>,
    write: string,
    speak: string,
  ) {
    if (finishing.current) {
      return;
    }
    finishing.current = true;
    setPending(true);
    playback.current?.stop();
    try {
      const done = await finishExam(auth, {
        target_lang: targetLang,
        exam_id: current.exam_id,
        answers: held,
        writing: write,
        speaking: speak,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
      setResult(done);
      setPhase("result");
      const refreshed = await fetchExamStatus(auth, targetLang);
      setStatus(refreshed);
      void tap("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.examEmpty);
      setPhase("error");
    } finally {
      setPending(false);
    }
  }

  const clock = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead
          kicker={copy.examKicker}
          title={copy.examTitle}
          dek={phase === "pick" ? copy.examDek : undefined}
          trailing={phase !== "pick" && phase !== "result" && phase !== "error" ? (
            <Text className="font-label text-sm text-ember">{`${copy.examClock} ${clock}`}</Text>
          ) : undefined}
        />
        {error && phase !== "error" ? <Text className="text-base text-ember">{error}</Text> : null}

        {phase === "pick" ? (
          <View className="gap-4">
            {status && status.exams.length === 0 ? <Text className="text-base leading-7 text-muted">{copy.examEmpty}</Text> : null}
            {status?.forecast ? (
              <View className="rounded-3xl border border-line bg-card px-5 py-4">
                <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.examForecast}</Text>
                <Text className="mt-2 font-displayItalic text-headline text-ink">{status.forecast.display}</Text>
                <Text className="mt-1 text-base text-muted">{`${copy.examBand} ${status.forecast.band}`}</Text>
              </View>
            ) : null}
            {status?.exams.map((exam) => (
              <ActionRow
                key={exam.id}
                title={exam.title}
                detail={status.track === exam.id && status.forecast ? `${copy.examForecast} ${status.forecast.display}` : copy.examDetail}
                onPress={() => void pickTrack(exam.id)}
                disabled={pending}
              />
            ))}
            {status?.track ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void begin()}
                disabled={pending}
                className="min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
              >
                <Text className="text-base font-semibold text-paper">{copy.examStart}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {phase === "item" && item ? (
          <View className="gap-4">
            {item.passage ? <Text className="text-lg leading-8 text-ink">{item.passage}</Text> : null}
            <Text className="text-lg leading-7 text-ink">{item.prompt}</Text>
            {item.audio ? (
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
                  onPress={() => keepChoice(optionIndex)}
                  className={`min-h-12 justify-center rounded-2xl border px-4 py-3 ${on ? "border-ember bg-emberSoft" : "border-line bg-paper"}`}
                >
                  <Text className="text-base leading-6 text-ink">{option}</Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={nextItem}
              disabled={picked === null}
              className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.placeNext}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "write" && mock ? (
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.examWrite}</Text>
            <Text className="mt-2 text-lg leading-8 text-ink">{mock.writing}</Text>
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
              className="mt-4 min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.placeNext}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "speak" && mock ? (
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.examSpeak}</Text>
            <Text className="mt-2 text-lg leading-8 text-ink">{mock.speaking}</Text>
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
              onPress={() => void close(auth, mock, answers, writing, speaking)}
              disabled={pending}
              className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
            >
              <Text className="text-base font-semibold text-paper">{copy.examSubmit}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "result" && result ? (
          <View className="gap-3">
            <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.examForecast}</Text>
            <Text className="font-displayItalic text-display text-ink">{result.display}</Text>
            <Text className="text-base text-muted">{`${copy.examBand} ${result.band}`}</Text>
            <Text className="text-base text-muted">{`${copy.examRaw} ${result.raw}`}</Text>
            {result.previous !== null ? <Text className="text-base text-muted">{`${copy.examWas} ${result.previous}`}</Text> : null}
            <Text className="text-base text-ember">{copy.examSaved}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPhase("pick");
                setMock(null);
                setResult(null);
              }}
              className="mt-2 min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.examStart}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "error" ? <Text className="text-base leading-7 text-ember">{error}</Text> : null}
      </View>
    </AppFrame>
  );
}
