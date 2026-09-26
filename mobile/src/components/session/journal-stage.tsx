import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { evaluateJournal } from "@/lib/api";
import { tap } from "@/lib/haptics";
import type { JournalEvaluation, LessonRequest } from "@/lib/types";
import { useTheme } from "@/theme/ThemeContext";

export function JournalStage({
  prompt,
  targetLang,
  nativeLang,
  level,
  onEvaluated,
}: {
  prompt: string;
  targetLang: string;
  nativeLang: string;
  level: LessonRequest["level"];
  onEvaluated?: () => void;
}) {
  const { palette } = useTheme();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<JournalEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const evaluation = await evaluateJournal({
        text: text.trim(),
        journal_prompt: prompt,
        target_lang: targetLang,
        native_lang: nativeLang,
        level,
      });
      setResult(evaluation);
      onEvaluated?.();
      void tap("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível corrigir o diário.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">Diário</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">{prompt}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        placeholder="Responda em algumas frases"
        placeholderTextColor={palette.onSurfaceVariant}
        accessibilityLabel="Resposta do diário"
        className="mt-4 min-h-40 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending || text.trim().length === 0, busy: pending }}
        disabled={pending || text.trim().length === 0}
        onPress={() => {
          void submit();
        }}
        className={`mt-4 min-h-12 items-center justify-center self-start rounded-full px-6 ${
          pending || text.trim().length === 0 ? "bg-line" : "bg-ember"
        }`}
      >
        <Text className={`text-base font-semibold ${pending || text.trim().length === 0 ? "text-muted" : "text-onEmber"}`}>
          {pending ? "Lendo sua resposta..." : "Pedir correção"}
        </Text>
      </Pressable>
      {error ? <Text className="mt-3 text-base text-roseInk">{error}</Text> : null}
      {result ? <UpgradeCard result={result} /> : null}
    </View>
  );
}

function UpgradeCard({ result }: { result: JournalEvaluation }) {
  const { palette } = useTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(1, { damping: 16, stiffness: 160 });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  return (
    <Animated.View className="mt-6 rounded-[28px] border border-line bg-card px-5 py-5" style={[style, { borderLeftWidth: 3, borderLeftColor: palette.primary }]}>
      <Text className="font-label text-sm text-ember">Upgrade nativo · {result.score}</Text>
      {result.corrections.map((correction) => (
        <View key={`${correction.original}-${correction.corrected}`} className="mt-4">
          <Text className="text-base text-muted">{correction.original}</Text>
          <Text className="mt-1 font-label text-base text-ink">{correction.corrected}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{correction.reason}</Text>
        </View>
      ))}
      <Text className="mt-5 font-display text-xl leading-7 text-ink">{result.native_upgrade}</Text>
    </Animated.View>
  );
}
