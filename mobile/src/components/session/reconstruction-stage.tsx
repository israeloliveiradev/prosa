import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { reconstructStory, transcribeSpeech } from "@/lib/api";
import { tap } from "@/lib/haptics";
import type { ReconstructionAnchor } from "@/lib/reconstruction";
import type { ReconstructionReport } from "@/lib/types";
import { useTheme } from "@/theme/ThemeContext";

export function ReconstructionStage({
  anchor,
  onCompleted,
}: {
  anchor: ReconstructionAnchor;
  onCompleted: () => void;
}) {
  const { palette } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef(false);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ReconstructionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        void recorder.stop();
      }
    };
  }, [recorder]);

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
        const spoken = await transcribeSpeech(uri, anchor.targetLang);
        if (!spoken) {
          throw new Error("Não ouvi fala nessa gravação.");
        }
        setText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken));
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
      setError("Precisamos do microfone para ditar a história.");
      return;
    }
    setError(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    recordingRef.current = true;
    setRecording(true);
    void tap("light");
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const report = await reconstructStory({
        attempt: text.trim(),
        story_text: anchor.storyText,
        translation: anchor.translation,
        target_lang: anchor.targetLang,
        through_lang: anchor.throughLang,
        level: anchor.level,
      });
      setResult(report);
      onCompleted();
      void tap(report.score >= 80 ? "success" : "medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível comparar a história.");
    } finally {
      setPending(false);
    }
  }

  const locked = pending || text.trim().length === 0;

  return (
    <View className="mb-8">
      <Text className="font-label text-xs uppercase tracking-widest text-ember">Reconstrução</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">Reescreva a história. Só a tradução está aqui.</Text>
      <View accessibilityLabel="Tradução para reescrever" className="mt-4 rounded-[28px] bg-card px-5 py-5">
        <Text className="text-lg leading-7 text-ink">{anchor.translation}</Text>
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        editable={!result}
        multiline
        textAlignVertical="top"
        placeholder="Escreva de novo, no idioma que você estuda"
        placeholderTextColor={palette.onSurfaceVariant}
        accessibilityLabel="Reescrita da história"
        className="mt-4 min-h-40 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
      />
      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: recording, busy: pending }}
          disabled={pending || Boolean(result)}
          onPress={() => {
            void dictate();
          }}
          className={`min-h-12 items-center justify-center rounded-full px-6 ${recording ? "bg-ember" : "bg-line"} ${pending || result ? "opacity-60" : ""}`}
        >
          <Text className={`text-base font-semibold ${recording ? "text-onEmber" : "text-ink"}`}>
            {recording ? "Parar e transcrever" : "Ditar"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: locked || Boolean(result), busy: pending }}
          disabled={locked || Boolean(result)}
          onPress={() => {
            void submit();
          }}
          className={`min-h-12 items-center justify-center rounded-full px-6 ${locked || result ? "bg-line" : "bg-ember"}`}
        >
          <Text className={`text-base font-semibold ${locked || result ? "text-muted" : "text-onEmber"}`}>
            {pending && !recording ? "Comparando..." : "Comparar"}
          </Text>
        </Pressable>
      </View>
      {error ? <Text className="mt-3 text-base text-roseInk">{error}</Text> : null}
      {result ? <ReconstructionReportView result={result} story={anchor.storyText} /> : null}
    </View>
  );
}

function ReconstructionReportView({ result, story }: { result: ReconstructionReport; story: string }) {
  return (
    <View className="mt-6 rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-sm text-ember">Nota {result.score}</Text>
      <Text className="mt-4 font-label text-sm text-ink">Erros gramaticais</Text>
      {result.grammar.length === 0 ? <Text className="mt-2 text-base text-muted">Nenhum erro gramatical direto.</Text> : null}
      {result.grammar.map((item) => (
        <View key={`${item.original}-${item.corrected}`} className="mt-3">
          <Text className="text-base text-muted">{item.original}</Text>
          <Text className="mt-1 font-label text-base text-ink">{item.corrected}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{item.reason}</Text>
        </View>
      ))}
      <Text className="mt-5 font-label text-sm text-ink">Tradução ao pé da letra</Text>
      {result.literals.length === 0 ? <Text className="mt-2 text-base text-muted">Nenhuma expressão traduzida palavra por palavra.</Text> : null}
      {result.literals.map((item) => (
        <View key={`${item.phrase}-${item.native_alternative}`} className="mt-3">
          <Text className="text-base text-muted">{item.phrase}</Text>
          <Text className="mt-1 font-label text-base text-ink">{item.native_alternative}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{item.reason}</Text>
        </View>
      ))}
      <Text className="mt-5 font-label text-sm text-ink">História original</Text>
      <Text className="mt-2 text-base leading-7 text-ink">{story}</Text>
    </View>
  );
}
