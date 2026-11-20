import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
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
import { TactilePage } from "@/features/shell/tactile-page";
import { TactileButton } from "@/components/tactile/tactile-button";
import { tactile } from "@/components/tactile/tokens";

type Phase = "pick" | "item" | "write" | "speak" | "result" | "error";

export function ExamScreen() {
  const session = useSession();
  const copy = useCopy();
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
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
    <TactilePage testID="exam-screen" kicker={copy.examKicker} title={copy.examTitle} dek={phase === "pick" ? copy.examDek : undefined}>
        {phase !== "pick" && phase !== "result" && phase !== "error" ? (
            <Text className="text-sm font-bold text-[#B45309]">{`${copy.examClock} ${clock}`}</Text>
          ) : null}
        {error && phase !== "error" ? <Text className="text-base text-[#B45309]">{error}</Text> : null}

        {phase === "pick" ? (
          <View className="gap-4">
            {status && status.exams.length === 0 ? <Text className="text-base leading-7 text-[#64748B]">{copy.examEmpty}</Text> : null}
            {status?.forecast ? (
              <View className="rounded-3xl border-2 border-[#E7E5E4] bg-white px-5 py-4">
                <Text className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">{copy.examForecast}</Text>
                <Text className="mt-2 font-display text-4xl font-extrabold text-[#111C2D]">{status.forecast.display}</Text>
                <Text className="mt-1 text-base text-[#64748B]">{`${copy.examBand} ${status.forecast.band}`}</Text>
              </View>
            ) : null}
            {status?.exams.map((exam) => (
              <Pressable
                key={exam.id}
                testID={`exam-track-${exam.id}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: status.track === exam.id, disabled: pending }}
                onPress={() => void pickTrack(exam.id)}
                disabled={pending}
                className={`rounded-2xl border-2 px-4 py-3 ${status.track === exam.id ? "border-[#0F766E] bg-[#F0FDFA]" : "border-[#E7E5E4] bg-white"}`}
              >
                <Text className="text-base font-extrabold text-[#111C2D]">{exam.title}</Text>
                <Text className="mt-0.5 text-sm text-[#64748B]">
                  {status.track === exam.id && status.forecast ? `${copy.examForecast} ${status.forecast.display}` : copy.examDetail}
                </Text>
              </Pressable>
            ))}
            {status?.track ? (
              <TactileButton testID="exam-start" label={copy.examStart} variant="primary" size="md" style={{ alignSelf: "flex-start" }} onPress={() => void begin()} disabled={pending} />
            ) : null}
          </View>
        ) : null}

        {phase === "item" && item ? (
          <View className="gap-4">
            {item.passage ? <Text className="text-lg leading-8 text-[#111C2D]">{item.passage}</Text> : null}
            <Text className="text-lg leading-7 text-[#111C2D]">{item.prompt}</Text>
            {item.audio ? (
              <TactileButton label={copy.examListen} variant="secondary" size="md" style={{ alignSelf: "flex-start" }} onPress={() => void hear(item)} />
            ) : null}
            {item.options.map((option, optionIndex) => {
              const on = picked === optionIndex;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => keepChoice(optionIndex)}
                  className={`min-h-12 justify-center rounded-2xl border px-4 py-3 ${on ? "border-[#0F766E] bg-[#F0FDFA]" : "border-[#E7E5E4] bg-white"}`}
                >
                  <Text className="text-base leading-6 text-[#111C2D]">{option}</Text>
                </Pressable>
              );
            })}
            <TactileButton testID="exam-next" label={copy.placeNext} variant="secondary" size="md" style={{ alignSelf: "flex-start" }} onPress={nextItem} disabled={picked === null} />
          </View>
        ) : null}

        {phase === "write" && mock ? (
          <View>
            <Text className="text-xs font-extrabold uppercase tracking-widest text-[#B45309]">{copy.examWrite}</Text>
            <Text className="mt-2 text-lg leading-8 text-[#111C2D]">{mock.writing}</Text>
            <TextInput
              value={writing}
              onChangeText={setWriting}
              multiline
              textAlignVertical="top"
              accessibilityLabel={copy.examWrite}
              placeholderTextColor={tactile.faint}
              className="mt-4 min-h-40 rounded-2xl border-2 border-[#E7E5E4] bg-white px-5 py-4 text-lg leading-7 text-[#111C2D]"
            />
            <TactileButton testID="exam-to-speak" label={copy.placeNext} variant="secondary" size="md" style={{ marginTop: 16, alignSelf: "flex-start" }} onPress={() => setPhase("speak")} />
          </View>
        ) : null}

        {phase === "speak" && mock ? (
          <View>
            <Text className="text-xs font-extrabold uppercase tracking-widest text-[#B45309]">{copy.examSpeak}</Text>
            <Text className="mt-2 text-lg leading-8 text-[#111C2D]">{mock.speaking}</Text>
            <TextInput
              value={speaking}
              onChangeText={setSpeaking}
              multiline
              textAlignVertical="top"
              accessibilityLabel={copy.examSpeak}
              placeholderTextColor={tactile.faint}
              className="mt-4 min-h-32 rounded-2xl border-2 border-[#E7E5E4] bg-white px-5 py-4 text-lg leading-7 text-[#111C2D]"
            />
            <TactileButton label={copy.examSubmit} variant="primary" size="md" style={{ marginTop: 16, alignSelf: "flex-start" }} onPress={() => void close(auth, mock, answers, writing, speaking)} disabled={pending} />
          </View>
        ) : null}

        {phase === "result" && result ? (
          <View className="gap-3">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">{copy.examForecast}</Text>
            <Text className="font-display text-5xl font-extrabold text-[#111C2D]">{result.display}</Text>
            <Text className="text-base text-[#64748B]">{`${copy.examBand} ${result.band}`}</Text>
            <Text className="text-base text-[#64748B]">{`${copy.examRaw} ${result.raw}`}</Text>
            {result.previous !== null ? <Text className="text-base text-[#64748B]">{`${copy.examWas} ${result.previous}`}</Text> : null}
            <Text className="text-base text-[#B45309]">{copy.examSaved}</Text>
            <TactileButton label={copy.examStart} variant="secondary" size="md" style={{ marginTop: 8, alignSelf: "flex-start" }} onPress={() => {
                setPhase("pick");
                setMock(null);
                setResult(null);
              }} />
          </View>
        ) : null}

        {phase === "error" ? <Text className="text-base leading-7 text-[#B45309]">{error}</Text> : null}
    </TactilePage>
  );
}
