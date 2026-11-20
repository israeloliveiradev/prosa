import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { GlassSheet } from "@/components/session/glass-sheet";
import { Kicker, StageCard } from "@/components/session/stage-kit";
import { TactileButton, type ButtonVariant } from "@/components/tactile/tactile-button";
import { fetchMnemonic } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { applyFsrs, type ReviewQuality } from "@/lib/fsrs";
import { keepWords } from "@/lib/text";
import type { SessionCard } from "@/lib/types";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

const GRADES: {
  quality: ReviewQuality;
  kind: "heavy" | "medium" | "light" | "success";
  variant: ButtonVariant;
  key: string;
}[] = [
  { quality: 0, kind: "heavy", variant: "crimson", key: "1" },
  { quality: 3, kind: "medium", variant: "amber", key: "2" },
  { quality: 4, kind: "light", variant: "secondary", key: "3" },
  { quality: 5, kind: "success", variant: "primary", key: "4" },
];

export function SrsStage({
  cards,
  onChange,
  heading,
  doneTitle,
}: {
  cards: SessionCard[];
  onChange: (cards: SessionCard[], graded: SessionCard, quality: ReviewQuality) => void;
  heading?: string;
  doneTitle?: string;
}) {
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [still, setStill] = useState(false);
  const [palaceOpen, setPalaceOpen] = useState(false);
  const [palaceText, setPalaceText] = useState<string | null>(null);
  const [palaceError, setPalaceError] = useState<string | null>(null);
  const [palaceBusy, setPalaceBusy] = useState(false);
  const card = cards[cursor];
  const done = !card;
  const session = useSession();
  const { palette } = useTheme();
  const copy = useCopy();
  const title = heading ?? copy.navMemory;
  const finished = doneTitle ?? copy.deckDone;
  const deckId = cards.map((item) => item.front_phrase.toLowerCase()).join("\0");

  useEffect(() => {
    setCursor(0);
    setRevealed(false);
    setNote(null);
  }, [deckId]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setStill);
  }, []);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function" || done) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        setRevealed((value) => !value);
        return;
      }
      const option = GRADES.find((item) => item.key === event.key);
      if (option && revealed) {
        event.preventDefault();
        grade(option.quality, option.kind);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function openPalace() {
    if (!card) {
      return;
    }
    void tap("light");
    setPalaceOpen(true);
    setPalaceText(null);
    setPalaceError(null);
    if (!session) {
      setPalaceError(copy.palaceSignIn);
      return;
    }
    setPalaceBusy(true);
    try {
      const result = await fetchMnemonic(session.token, card);
      if (!result.eligible || !result.association_text) {
        setPalaceError(copy.palaceNotReady);
        return;
      }
      setPalaceText(result.association_text);
    } catch (caught) {
      setPalaceError(caught instanceof Error ? caught.message : copy.palaceFailed);
    } finally {
      setPalaceBusy(false);
    }
  }

  function grade(quality: ReviewQuality, kind: (typeof GRADES)[number]["kind"]) {
    if (!card) {
      return;
    }
    void tap(kind);
    const nextCard = applyFsrs(card, quality);
    onChange(
      cards.map((item, index) => (index === cursor ? nextCard : item)),
      card,
      quality,
    );
    setNote(
      nextCard.interval_days < 1
        ? copy.reviewSoon
        : `${copy.nextReviewIn} ${nextCard.interval_days} ${nextCard.interval_days === 1 ? copy.day : copy.days}.`,
    );
    setRevealed(false);
    setCursor((value) => value + 1);
  }

  if (done) {
    const mastered = cards.filter((item) => item.status === "mastered").length;
    return (
      <StageCard>
        <Kicker>{title}</Kicker>
        <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{finished}</Text>
        <Text className="mt-3 font-sans text-base leading-6 text-muted">
          {cards.length} {copy.cardsReviewed}. {mastered} {copy.masteredCount}.
        </Text>
        {note ? <Text className="mt-4 font-sans text-base font-semibold text-ink">{note}</Text> : null}
      </StageCard>
    );
  }

  return (
    <View>
      <View className="flex-row items-center justify-between gap-3">
        <Kicker>{title}</Kicker>
        <Text className="font-sans text-sm font-bold text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {copy.cardOf} {cursor + 1} {copy.ofWord} {cards.length}
        </Text>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: palette.raised }}>
        <View className="h-full rounded-full" style={{ width: `${(cursor / Math.max(1, cards.length)) * 100}%`, backgroundColor: palette.primary }} />
      </View>
      <FlipCard
        key={`${cursor}-${card.front_phrase}`}
        card={card}
        revealed={revealed}
        still={still}
        onFlip={() => setRevealed((value) => !value)}
        onGrade={(quality) => {
          const kind = GRADES.find((item) => item.quality === quality)?.kind ?? "medium";
          grade(quality, kind);
        }}
      />
      <View className="mt-4 flex-row flex-wrap items-center gap-2">
        <TactileButton
          variant="secondary"
          size="md"
          label={revealed ? copy.flipToWord : copy.flipCard}
          onPress={() => setRevealed((value) => !value)}
        />
        {card.repetition_count > 3 ? (
          <TactileButton
            variant="secondary"
            size="md"
            onPress={() => void openPalace()}
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.5.7 1.1.8 1.8h4.4c.1-.7.4-1.3.8-1.8A6 6 0 0 0 12 3Z"
                  stroke={palette.primary}
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </Svg>
            }
            label={copy.palace}
          />
        ) : null}
      </View>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {GRADES.map((gradeOption) => {
          const label =
            gradeOption.quality === 0
              ? copy.gradeMissed
              : gradeOption.quality === 3
                ? copy.gradeHard
                : gradeOption.quality === 4
                  ? copy.gradeGood
                  : copy.gradeEasy;
          return (
            <View key={gradeOption.quality} className="min-w-[46%] flex-1 md:min-w-0">
              <TactileButton
                variant={gradeOption.variant}
                size="lg"
                fullWidth
                disabled={!revealed}
                onPress={() => grade(gradeOption.quality, gradeOption.kind)}
                label={label}
              />
            </View>
          );
        })}
      </View>
      {note ? (
        <Text accessibilityLiveRegion="polite" className="mt-3 font-sans text-sm text-muted">
          {note}
        </Text>
      ) : null}
      <GlassSheet visible={palaceOpen} onClose={() => setPalaceOpen(false)} label={copy.palaceMemory}>
        {palaceBusy ? <ActivityIndicator color={palette.primary} /> : null}
        {palaceText ? <Text className="mt-3 font-sans text-lg leading-8 text-ink">{palaceText}</Text> : null}
        {palaceError ? <Text className="mt-3 font-sans text-base leading-6 text-muted">{palaceError}</Text> : null}
      </GlassSheet>
    </View>
  );
}

function FlipCard({
  card,
  revealed,
  still,
  onFlip,
  onGrade,
}: {
  card: SessionCard;
  revealed: boolean;
  still: boolean;
  onFlip: () => void;
  onGrade: (quality: ReviewQuality) => void;
}) {
  const { palette } = useTheme();
  const copy = useCopy();
  const drag = useSharedValue(0);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value }, { rotate: `${drag.value / 18}deg` }],
  }));
  const leftHint = useAnimatedStyle(() => ({ opacity: drag.value < 0 ? Math.min(1, -drag.value / 120) : 0 }));
  const rightHint = useAnimatedStyle(() => ({ opacity: drag.value > 0 ? Math.min(1, drag.value / 120) : 0 }));

  const gesture = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      drag.value = event.translationX;
    })
    .onEnd((event) => {
      const distance = event.translationX;
      if (revealed && distance > 110) {
        drag.value = withTiming(still ? 0 : 480, { duration: still ? 1 : 260 }, (done) => {
          if (done) {
            runOnJS(onGrade)(5);
          }
        });
        return;
      }
      if (revealed && distance < -110) {
        drag.value = withTiming(still ? 0 : -480, { duration: still ? 1 : 260 }, (done) => {
          if (done) {
            runOnJS(onGrade)(0);
          }
        });
        return;
      }
      drag.value = withSpring(0, { damping: 18, stiffness: 180 });
      if (!revealed && Math.abs(distance) > 48) {
        runOnJS(onFlip)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrap, motion]}>
        <Animated.View pointerEvents="none" style={[styles.hint, styles.hintLeft, leftHint, { backgroundColor: palette.errorContainer }]}>
          <Text className="font-sans text-sm font-bold text-roseInk">{copy.gradeMissed}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.hint, styles.hintRight, rightHint, { backgroundColor: palette.secondaryContainer }]}>
          <Text className="font-sans text-sm font-bold text-moss">{copy.gradeEasy}</Text>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? copy.flipToWord : copy.flipCard}
          accessibilityHint={copy.flipHintAfter}
          onPress={onFlip}
          className="cursor-pointer"
          style={[
            styles.card,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              borderBottomColor: palette.control,
            },
          ]}
        >
          <View style={[styles.stripe, { backgroundColor: palette.primary }]} />
          <Text className="font-sans text-xs font-extrabold uppercase tracking-widest text-primary">{revealed ? copy.cardBack : copy.cardFront}</Text>
          {revealed ? (
            <>
              <Text className="mt-4 w-full text-center font-display text-2xl leading-8 font-extrabold text-ink">{card.back_translation}</Text>
              <Text className="mt-3 w-full text-center font-serif text-lg leading-8 text-ink">{card.context_sentence}</Text>
            </>
          ) : (
            <Text className="mt-6 w-full text-center font-display text-4xl font-extrabold text-ink">{keepWords(card.front_phrase)}</Text>
          )}
          <Text className="mt-6 w-full text-center font-sans text-sm leading-6 text-muted">
            {revealed ? copy.tapForWord : copy.tapForTranslation}
          </Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    position: "relative",
  },
  card: {
    minHeight: 240,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    paddingHorizontal: 28,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stripe: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 8,
  },
  hint: {
    position: "absolute",
    top: 16,
    zIndex: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintLeft: {
    left: 16,
  },
  hintRight: {
    right: 16,
  },
});
