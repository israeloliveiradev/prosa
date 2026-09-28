import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { fetchPersonaScenes, sendPersonaTurn, speakStory, transcribeSpeech, type PersonaScene } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

type Tone = "adequate" | "direct" | "informal" | "inadequate";

interface Turn {
  role: "persona" | "learner";
  text: string;
  tone?: Tone;
  note?: string;
}

const TONE_LABEL: Record<Tone, string> = {
  adequate: "O tom serviu a esta cena.",
  direct: "Ficou direto demais para esta cena.",
  informal: "Ficou informal demais para esta cena.",
  inadequate: "Faltou um costume deste lugar.",
};

export function PersonaScreen() {
  const { palette } = useTheme();
  const session = useSession();
  const token = session?.token;
  const targetLang = session?.user.target_lang ?? "en";
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef(false);
  const [scenes, setScenes] = useState<PersonaScene[]>([]);
  const [scene, setScene] = useState<PersonaScene | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"loading" | "list" | "talk" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.replace("/account");
      return;
    }
    let active = true;
    setPhase("loading");
    void fetchPersonaScenes(token)
      .then((next) => {
        if (!active) {
          return;
        }
        setScenes(next);
        setPhase("list");
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "As cenas não abriram.");
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  function openScene(next: PersonaScene) {
    AudioService.stopAndUnload();
    setScene(next);
    setTurns([{ role: "persona", text: next.opener }]);
    setDraft("");
    setError(null);
    setPhase("talk");
    void tap("light");
    void playLine(next.opener);
  }

  async function playLine(text: string) {
    try {
      const spoken = await speakStory(text, targetLang, narratorVoice(targetLang));
      AudioService.play(spoken.audioUrl, 1, () => undefined, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A voz não abriu. O texto continua aqui.");
    }
  }

  async function dictate() {
    if (pending) {
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
        setDraft((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken));
        void tap("light");
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
    await recorder.prepareToRecordAsync();
    recorder.record();
    recordingRef.current = true;
    setRecording(true);
    void tap("light");
  }

  async function send() {
    if (!token || !scene || pending) {
      return;
    }
    const line = draft.trim();
    if (!line) {
      return;
    }
    const history = turns.slice(1).slice(-12).map((turn) => ({ role: turn.role, text: turn.text }));
    setDraft("");
    setTurns((current) => [...current, { role: "learner", text: line }]);
    setPending(true);
    setError(null);
    AudioService.stopAndUnload();
    try {
      const result = await sendPersonaTurn(token, scene.id, line, history);
      setTurns((current) => [...current, { role: "persona", text: result.reply, tone: result.tone, note: result.cultural_note }]);
      void tap(result.tone === "adequate" ? "success" : "medium");
      void playLine(result.reply);
    } catch (caught) {
      setTurns((current) => current.slice(0, -1));
      setDraft(line);
      setError(caught instanceof Error ? caught.message : "A cena não respondeu.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <AppFrame>
      <View className="gap-8 pb-16">
        <View className="self-start">
          <ChunkButton label="Voltar ao início" onPress={() => router.replace("/")} tone="ghost" />
        </View>
        {phase === "loading" ? <Text className="text-base text-muted">Abrindo as cenas.</Text> : null}
        {phase === "error" ? (
          <View>
            <Text className="font-displayItalic text-headline text-ink">A cena não abriu</Text>
            <Text className="mt-3 text-base leading-7 text-muted">{error}</Text>
          </View>
        ) : null}
        {phase === "list" ? (
          <View className="gap-4">
            <PageMasthead
              kicker="Oficina"
              title="Cena"
              dek="Escolha um lugar. A pessoa responde no idioma que você estuda, e a dica explica o tom."
            />
            {scenes.length === 0 ? <Text className="text-base text-muted">Não há cenas para este idioma.</Text> : null}
            {scenes.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.role}, ${item.register === "formal" ? "formal" : "informal"}`}
                onPress={() => openScene(item)}
                className="min-h-16 cursor-pointer border-b border-line py-5"
              >
                <Text className="font-displayItalic text-3xl text-ink">{item.title}</Text>
                <Text className="mt-2 text-base text-ink">{item.role}</Text>
                <Text className="mt-1 text-base text-muted">{item.brief}</Text>
                <Text className="mt-3 font-label text-sm text-ember">{item.register === "formal" ? "Formal" : "Informal"} · Abrir</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {phase === "talk" && scene ? (
          <View className="gap-4">
            <PageMasthead
              kicker={scene.place}
              title={scene.title}
              dek={`${scene.role}. ${scene.register === "formal" ? "Tom formal." : "Tom informal."}`}
            />
            {turns.map((turn, index) => (
              <View key={`${turn.role}-${index}`} className={turn.role === "learner" ? "items-end" : "items-start"}>
                <View className={`max-w-[90%] rounded-3xl px-5 py-4 ${turn.role === "learner" ? "bg-ember" : "border border-line bg-card"}`}>
                  <Text className={`text-lg leading-7 ${turn.role === "learner" ? "text-onEmber" : "text-ink"}`}>{turn.text}</Text>
                </View>
                {turn.note && turn.tone ? (
                  <View className="mt-2 max-w-[90%] rounded-3xl border border-line bg-card px-5 py-4">
                    <Text className="font-label text-sm text-moss">Dica cultural</Text>
                    <Text className="mt-2 text-base font-semibold text-ink">{TONE_LABEL[turn.tone]}</Text>
                    <Text className="mt-2 text-base leading-7 text-muted">{turn.note}</Text>
                  </View>
                ) : null}
              </View>
            ))}
            {pending ? (
              <Text accessibilityLiveRegion="polite" className="text-base text-muted">
                A pessoa está respondendo.
              </Text>
            ) : null}
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
                <Text className={`text-base font-semibold ${recording ? "text-onEmber" : "text-ink"}`}>{recording ? "Parar e transcrever" : "Ditar"}</Text>
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
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  AudioService.stopAndUnload();
                  setScene(null);
                  setTurns([]);
                  setPhase("list");
                }}
                className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-line px-6"
              >
                <Text className="text-base font-semibold text-ink">Outras cenas</Text>
              </Pressable>
            </View>
            {error ? <Text className="text-base text-roseInk">{error}</Text> : null}
          </View>
        ) : null}
      </View>
    </AppFrame>
  );
}
