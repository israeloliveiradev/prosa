import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { evaluateJournal, offerPair } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import type { JournalEvaluation, LessonRequest, RepairCard } from "@/lib/types";
import { useTheme } from "@/theme/ThemeContext";

export function JournalStage({
  prompt,
  targetLang,
  nativeLang,
  level,
  onEvaluated,
  onCards,
}: {
  prompt: string;
  targetLang: string;
  nativeLang: string;
  level: LessonRequest["level"];
  onEvaluated?: () => void;
  onCards?: (cards: RepairCard[]) => void;
}) {
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();
  const counted = useRef(false);
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<JournalEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paired, setPaired] = useState<string | null>(null);
  const open = !result || (result.step !== "correction" && result.corrections.length > 0);

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
        attempt,
        token: session?.token,
      });
      setResult(evaluation);
      if (evaluation.cards && evaluation.cards.length > 0) {
        onCards?.(evaluation.cards);
      }
      const stillOpen = evaluation.step !== "correction" && evaluation.corrections.length > 0;
      if (stillOpen) {
        setAttempt((current) => Math.min(4, current + 1));
      } else if (!counted.current) {
        counted.current = true;
        onEvaluated?.();
      }
      void tap("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.journalFailed);
    } finally {
      setPending(false);
    }
  }

  const blocked = pending || text.trim().length === 0;

  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.journal}</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">{prompt}</Text>
      <Text className="mt-4 font-label text-sm text-muted">{copy.yourReply}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        editable={open}
        multiline
        textAlignVertical="top"
        placeholder={copy.journalPlaceholder}
        placeholderTextColor={palette.onSurfaceVariant}
        accessibilityLabel={copy.journalLabel}
        className="mt-2 min-h-40 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
      />
      <Text className="mt-2 text-sm text-muted">{`${text.trim().length} ${copy.characters}`}</Text>
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: blocked, busy: pending }}
          disabled={blocked}
          onPress={() => {
            void submit();
          }}
          className={`mt-4 min-h-12 items-center justify-center self-start rounded-full px-6 ${blocked ? "bg-line" : "bg-ember"}`}
        >
          <Text className={`text-base font-semibold ${blocked ? "text-muted" : "text-onEmber"}`}>
            {pending ? copy.askingCorrection : attempt > 1 ? copy.journalRetry : copy.askCorrection}
          </Text>
        </Pressable>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
      {result?.cards && result.cards.length > 0 ? <Text className="mt-3 text-base text-moss">{copy.repairCardSaved}</Text> : null}
      {result && session?.token ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void offerPair(session.token, { target_lang: targetLang, prompt, body: text.trim() })
              .then((next) => setPaired(next.matched ? copy.pairOffered : copy.pairWaiting))
              .catch(() => setPaired(copy.pairEmpty));
          }}
          className="mt-4 min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
        >
          <Text className="text-base font-semibold text-ink">{paired ?? copy.pairOffer}</Text>
        </Pressable>
      ) : null}
      {result ? <UpgradeCard result={result} /> : null}
    </View>
  );
}

function UpgradeCard({ result }: { result: JournalEvaluation }) {
  const { palette } = useTheme();
  const copy = useCopy();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(1, { damping: 16, stiffness: 160 });
  }, [progress, result]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  return (
    <Animated.View className="mt-6 rounded-[28px] border border-line bg-card px-5 py-5" style={[style, { borderLeftWidth: 3, borderLeftColor: palette.primary }]}>
      <Text className="font-label text-sm text-ember">{result.native_upgrade ? `Upgrade nativo · ${result.score}` : `${result.score}`}</Text>
      {result.corrections.map((correction, index) => (
        <View key={`${correction.original}-${index}`} className="mt-4">
          <Text className="text-base text-muted">{correction.original}</Text>
          {correction.step === "prompt" ? <Text className="mt-1 text-sm leading-5 text-ink">{copy.journalRewrite}</Text> : null}
          {correction.kind ? <Text className="mt-1 font-label text-sm text-ember">{correction.kind}</Text> : null}
          {correction.reason ? <Text className="mt-1 text-sm leading-5 text-muted">{correction.reason}</Text> : null}
          {correction.corrected ? <Text className="mt-1 font-label text-base text-ink">{correction.corrected}</Text> : null}
        </View>
      ))}
      {result.native_upgrade ? <Text className="mt-5 font-display text-xl leading-7 text-ink">{result.native_upgrade}</Text> : null}
    </Animated.View>
  );
}
