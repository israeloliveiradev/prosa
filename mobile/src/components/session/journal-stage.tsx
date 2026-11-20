import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
import { evaluateJournal, offerPair } from "@/lib/api";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
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
  /** Chamado uma vez, quando a escada de correção fecha. */
  onEvaluated?: (evaluation: JournalEvaluation) => void;
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
        onEvaluated?.(evaluation);
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
    <View className="gap-4">
      <StageCard>
        <Kicker>{copy.journal}</Kicker>
        <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{prompt}</Text>
        <Text className="mt-4 font-sans text-sm font-bold text-muted">{copy.yourReply}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          editable={open && !pending}
          multiline
          textAlignVertical="top"
          placeholder={copy.journalPlaceholder}
          placeholderTextColor={palette.faint}
          accessibilityLabel={copy.journalLabel}
          className="mt-2 min-h-40 rounded-2xl px-4 py-3 font-serif text-lg leading-8 text-ink"
          style={{ backgroundColor: palette.raised, borderWidth: 2, borderColor: palette.border }}
        />
        <Text className="mt-2 font-sans text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>{`${text.trim().length} ${copy.characters}`}</Text>
        {open ? (
          <View className="mt-4 flex-row">
            <TactileButton
              variant="primary"
              size="lg"
              disabled={blocked}
              onPress={() => void submit()}
              label={pending ? copy.askingCorrection : attempt > 1 ? copy.journalRetry : copy.askCorrection}
            />
          </View>
        ) : null}
        {error ? <Notice>{error}</Notice> : null}
        {result?.cards && result.cards.length > 0 ? <Notice tone="success">{copy.repairCardSaved}</Notice> : null}
      </StageCard>
      {result ? <UpgradeCard result={result} /> : null}
      {result && session?.token ? (
        <View className="flex-row">
          <TactileButton
            variant="secondary"
            size="md"
            onPress={() => {
              void offerPair(session.token, { target_lang: targetLang, prompt, body: text.trim() })
                .then((next) => setPaired(next.matched ? copy.pairOffered : copy.pairWaiting))
                .catch(() => setPaired(copy.pairEmpty));
            }}
            label={paired ?? copy.pairOffer}
          />
        </View>
      ) : null}
    </View>
  );
}

function UpgradeCard({ result }: { result: JournalEvaluation }) {
  const { palette } = useTheme();
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(1, { damping: 16, stiffness: 160 });
  }, [progress, result]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  return (
    <Animated.View style={style}>
      <StageCard style={{ borderLeftWidth: 4, borderLeftColor: palette.primary }}>
        <Kicker>{fill(local.score, { score: result.score })}</Kicker>
        {result.corrections.map((correction, index) => (
          <View key={`${correction.original}-${index}`} className="mt-4">
            <Text className="font-sans text-base text-muted" style={{ textDecorationLine: correction.corrected ? "line-through" : "none" }}>
              {correction.original}
            </Text>
            {correction.step === "prompt" ? <Text className="mt-1 font-sans text-sm leading-5 text-ink">{copy.journalRewrite}</Text> : null}
            {correction.kind ? <Text className="mt-1 font-sans text-xs font-extrabold uppercase tracking-wider text-accentInk">{correction.kind}</Text> : null}
            {correction.reason ? <Text className="mt-1 font-sans text-sm leading-5 text-muted">{correction.reason}</Text> : null}
            {correction.corrected ? <Text className="mt-1 font-sans text-base font-bold text-ink">{correction.corrected}</Text> : null}
          </View>
        ))}
        {result.native_upgrade ? (
          <View className="mt-5 rounded-xl px-4 py-3" style={{ backgroundColor: palette.active }}>
            <Text className="font-sans text-xs font-extrabold uppercase tracking-wider text-primary">{local.nativeVersion}</Text>
            <Text className="mt-1 font-serif text-lg leading-8 text-ink">{result.native_upgrade}</Text>
          </View>
        ) : null}
      </StageCard>
    </Animated.View>
  );
}
