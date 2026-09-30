import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { Figure } from "@/components/cast/figure";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { mindById } from "@/design/minds";
import { fetchProseMemory, sendProseTurn, speakStory, transcribeSpeech, type ProseTurnResult } from "@/lib/api";
import { useCast } from "@/lib/cast";
import { useCopy } from "@/lib/i18n";
import { tap } from "@/lib/haptics";
import { narratorVoice } from "@/lib/narrator";
import { useProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

interface Turn {
  role: "mind" | "learner";
  text: string;
  note?: string;
  move?: ProseTurnResult["move"];
  repair?: ProseTurnResult["repair"];
}

interface MentorMemory {
  facts: string[];
  goals: string[];
  thread: string;
}

const MAX_LEARNER_TURNS = 8;

function repairCopy(repair: NonNullable<Turn["repair"]>): string {
  if (repair.step === "hint") {
    return repair.mark ? `Pista: ${repair.mark}` : "Pista: olha de novo essa frase.";
  }
  if (repair.step === "correction" && repair.fix) {
    return `Assim fica natural: ${repair.fix}`;
  }
  return "Tem um ponto para refazer. Diz de novo, do teu jeito.";
}

function storyExcerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 700) {
    return trimmed;
  }
  return `${trimmed.slice(0, 697).trimEnd()}…`;
}

export function ProseScreen() {
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();
  const progress = useProgress();
  const { picks } = useCast();
  const token = session?.token;
  const targetLang = session?.user.target_lang ?? "en";
  const companion = mindById(picks.speech);
  const topic = (progress.topic ?? "everyday life").trim().slice(0, 80) || "everyday life";
  const story = progress.cachedLesson ? storyExcerpt(progress.cachedLesson.story_text) : undefined;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef(false);
  const [round, setRound] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<MentorMemory | null>(null);

  const learnerTurns = turns.filter((turn) => turn.role === "learner").length;
  const closed = learnerTurns >= MAX_LEARNER_TURNS;

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
      if (recordingRef.current) {
        void recorder.stop();
      }
    };
  }, [recorder]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setPending(true);
    setError(null);
    void fetchProseMemory(token).then(setMemory).catch(() => undefined);
    void sendProseTurn(token, {
      userLine: "",
      topic,
      story,
      mind: companion.id,
      history: [],
    })
      .then((result) => {
        if (!active) {
          return;
        }
        setTurns([{ role: "mind", text: result.reply, note: result.through_note || undefined, move: result.move }]);
        if (result.memory) {
          setMemory(result.memory);
        }
        void tap("light");
        void playLine(result.reply);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "A conversa não abriu.");
      })
      .finally(() => {
        if (active) {
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, round]);

  async function playLine(text: string) {
    try {
      const spoken = await speakStory(text, targetLang, narratorVoice(targetLang));
      AudioService.play(spoken.audioUrl, 1, () => undefined, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A voz não abriu. O texto continua aqui.");
    }
  }

  async function sendLine(line: string) {
    if (!token || pending || closed || !line.trim()) {
      return;
    }
    const history = turns.slice(-8).map((turn) => ({ role: turn.role, text: turn.text }));
    setDraft("");
    setTurns((current) => [...current, { role: "learner", text: line }]);
    setPending(true);
    setError(null);
    AudioService.stopAndUnload();
    try {
      const result = await sendProseTurn(token, {
        userLine: line,
        topic,
        story,
        mind: companion.id,
        history,
      });
      setTurns((current) => [
        ...current,
        { role: "mind", text: result.reply, note: result.through_note || undefined, move: result.move, repair: result.repair },
      ]);
      if (result.memory) {
        setMemory(result.memory);
      }
      void tap("success");
      void playLine(result.reply);
    } catch (caught) {
      setTurns((current) => current.slice(0, -1));
      setDraft(line);
      setError(caught instanceof Error ? caught.message : "A conversa não respondeu.");
    } finally {
      setPending(false);
    }
  }

  async function dictate() {
    if (pending || closed) {
      return;
    }
    if (recording) {
      recordingRef.current = false;
      setRecording(false);
      setPending(true);
      setError(null);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          throw new Error("A gravação não foi salva.");
        }
        const spoken = await transcribeSpeech(uri, targetLang);
        if (!spoken) {
          throw new Error("Não ouvi fala nessa gravação.");
        }
        void tap("light");
        await sendLine(spoken);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Não foi possível transcrever a fala.");
      } finally {
        setPending(false);
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Precisamos do microfone para ditar a fala.");
      return;
    }
    setError(null);
    AudioService.stopAndUnload();
    await recorder.prepareToRecordAsync();
    recorder.record();
    recordingRef.current = true;
    setRecording(true);
    void tap("light");
  }

  async function send() {
    await sendLine(draft.trim());
  }

  function retryOpen() {
    setTurns([]);
    setDraft("");
    setError(null);
    setRound((current) => current + 1);
  }

  if (!token) {
    return <Redirect href="/account" />;
  }

  return (
    <AppFrame>
      <View className="gap-8 pb-16">
        <View className="self-start">
          <ChunkButton label="Voltar à prática" onPress={() => router.replace("/practice")} tone="ghost" />
        </View>
        <View className="flex-row items-end gap-4">
          <Figure who={companion.id} size={96} />
          <View className="min-w-0 flex-1">
            <PageMasthead
              kicker={companion.name}
              title="Conversa"
              dek={`Uma conversa curta sobre ${topic}. ${companion.name} responde no idioma que você estuda. Falar corta a voz dele.`}
            />
          </View>
        </View>
        {memory && (memory.facts.length > 0 || memory.goals.length > 0) ? (
          <Text className="text-base leading-7 text-muted">
            Ele lembra: {[...memory.goals, ...memory.facts].slice(0, 3).join(" · ")}
          </Text>
        ) : null}
        {turns.map((turn, index) => (
          <View key={`${turn.role}-${index}`} className={turn.role === "learner" ? "items-end" : "items-start"}>
            <View className={`max-w-[90%] rounded-3xl px-5 py-4 ${turn.role === "learner" ? "bg-ember" : "border border-line bg-card"}`}>
              <Text className={`text-lg leading-7 ${turn.role === "learner" ? "text-onEmber" : "text-ink"}`}>{turn.text}</Text>
            </View>
            {turn.move === "clarify" || turn.move === "rephrase" ? (
              <Text className="mt-2 max-w-[90%] text-sm text-muted">
                {turn.move === "clarify" ? copy.talkClarify : copy.talkRephrase}
              </Text>
            ) : null}
            {turn.repair && turn.repair.step !== "none" ? (
              <View className="mt-2 max-w-[90%] rounded-3xl border border-line bg-paper px-5 py-4">
                <Text className="text-base leading-7 text-ink">{repairCopy(turn.repair)}</Text>
              </View>
            ) : null}
            {turn.note ? (
              <View className="mt-2 max-w-[90%] rounded-3xl border border-line bg-card px-5 py-4">
                <Text className="font-label text-sm text-moss">No meio</Text>
                <Text className="mt-2 text-base leading-7 text-muted">{turn.note}</Text>
              </View>
            ) : null}
          </View>
        ))}
        {pending ? (
          <Text accessibilityLiveRegion="polite" className="text-base text-muted">
            {turns.length === 0 ? "Abrindo a conversa." : `${companion.name} está respondendo.`}
          </Text>
        ) : null}
        {closed ? (
          <Text className="text-base leading-7 text-muted">Esta conversa fecha aqui. Volte amanhã com o assunto do dia.</Text>
        ) : (
          <>
            <Text className="mt-2 font-label text-sm text-muted">Sua fala</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!pending}
              multiline
              textAlignVertical="top"
              placeholder="No idioma que você estuda"
              placeholderTextColor={palette.onSurfaceVariant}
              accessibilityLabel="Sua fala"
              className="min-h-24 rounded-3xl bg-card px-5 py-4 text-lg leading-7 text-ink"
            />
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: recording, busy: pending }}
                disabled={pending}
                onPress={() => void dictate()}
                className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-6 ${recording ? "bg-ember" : "bg-line"}`}
              >
                <Text className={`text-base font-semibold ${recording ? "text-onEmber" : "text-ink"}`}>{recording ? "Parar e enviar" : "Falar"}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: pending || draft.trim().length === 0, busy: pending }}
                disabled={pending || draft.trim().length === 0}
                onPress={() => void send()}
                className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-6 ${pending || draft.trim().length === 0 ? "bg-line" : "bg-ember"}`}
              >
                <Text className={`text-base font-semibold ${pending || draft.trim().length === 0 ? "text-muted" : "text-onEmber"}`}>Enviar</Text>
              </Pressable>
            </View>
          </>
        )}
        {error ? (
          <View className="gap-3">
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-base text-roseInk">
              {error}
            </Text>
            {turns.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={retryOpen}
                className="min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6"
              >
                <Text className="text-base font-semibold text-onEmber">Tentar de novo</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </AppFrame>
  );
}
