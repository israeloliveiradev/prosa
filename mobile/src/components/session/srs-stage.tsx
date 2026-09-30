import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { GlassSheet } from "@/components/session/glass-sheet";
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
  background: string;
  color: string;
}[] = [
  { quality: 0, kind: "heavy", background: "#F8D6DB", color: "#8E1B2C" },
  { quality: 3, kind: "medium", background: "#F0D2CB", color: "#6B2D2A" },
  { quality: 4, kind: "light", background: "#DCE6D4", color: "#24301E" },
  { quality: 5, kind: "success", background: "#6B2D2A", color: "#FFF8F4" },
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
      <View className="border-t border-ink pt-6">
        <Text className="font-label text-xs uppercase tracking-widest text-ember">{title}</Text>
        <Text className="font-displayItalic mt-2 text-headline text-ink">{finished}</Text>
        <Text className="mt-3 text-base leading-6 text-muted">
          {cards.length} {copy.cardsReviewed}. {mastered} {copy.masteredCount}.
        </Text>
        {note ? <Text className="mt-4 text-base font-semibold text-ink">{note}</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{title}</Text>
      <Text className="mt-2 text-base text-muted">
        {copy.cardOf} {cursor + 1} {copy.ofWord} {cards.length}
      </Text>
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
      {card.repetition_count > 3 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.palaceMemory}
          onPress={() => void openPalace()}
          className="mt-3 min-h-12 cursor-pointer flex-row items-center justify-center gap-2 self-start rounded-full border border-line bg-card px-4"
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.5.7 1.1.8 1.8h4.4c.1-.7.4-1.3.8-1.8A6 6 0 0 0 12 3Z"
              stroke={palette.primary}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
          <Text className="font-label text-base text-ink">{copy.palace}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.flipCard}
        accessibilityHint={copy.flipHint}
        onPress={() => setRevealed((value) => !value)}
        className="mt-3 min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line bg-card px-5"
      >
        <Text className="font-label text-base text-ink">{copy.flipCard}</Text>
      </Pressable>
      <View className="mt-2 flex-row flex-wrap gap-2">
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
          <Pressable
            key={gradeOption.quality}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${gradeOption.quality}`}
            accessibilityState={{ disabled: !revealed }}
            disabled={!revealed}
            onPress={() => grade(gradeOption.quality, gradeOption.kind)}
            className={`min-h-12 min-w-[46%] flex-1 cursor-pointer items-center justify-center rounded-full px-3 ${gradeOption.quality === 5 ? "bg-ember" : ""}`}
            style={gradeOption.quality === 5 ? { opacity: revealed ? 1 : 0.4 } : { backgroundColor: gradeOption.background, opacity: revealed ? 1 : 0.4 }}
          >
            <Text className={`text-base font-semibold ${gradeOption.quality === 5 ? "text-onEmber" : ""}`} style={gradeOption.quality === 5 ? undefined : { color: gradeOption.color }}>
              {label}
            </Text>
          </Pressable>
          );
        })}
      </View>
      {note ? <Text className="mt-3 text-sm text-muted">{note}</Text> : null}
      <GlassSheet visible={palaceOpen} onClose={() => setPalaceOpen(false)} label={copy.palaceMemory}>
        {palaceBusy ? <ActivityIndicator color={palette.primary} /> : null}
        {palaceText ? <Text className="mt-3 text-lg leading-8 text-ink">{palaceText}</Text> : null}
        {palaceError ? <Text className="mt-3 text-base leading-6 text-muted">{palaceError}</Text> : null}
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
          <Text className="font-label text-sm text-roseInk">{copy.gradeMissed}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.hint, styles.hintRight, rightHint, { backgroundColor: palette.secondaryContainer }]}>
          <Text className="font-label text-sm text-moss">{copy.gradeEasy}</Text>
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
              backgroundColor: palette.surfaceBright,
              borderColor: palette.outline,
              shadowColor: palette.onSurface,
              shadowOpacity: 0.14,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
            },
          ]}
        >
          <View style={[styles.stripe, { backgroundColor: palette.primary }]} />
          <Text className="font-label text-xs uppercase tracking-widest text-ember">{revealed ? copy.cardBack : copy.cardFront}</Text>
          {revealed ? (
            <>
              <Text className="mt-4 w-full text-center font-displayItalic text-headline text-ink">{keepWords(card.back_translation)}</Text>
              <Text className="mt-3 w-full text-center text-lg leading-7 text-ink">{keepWords(card.context_sentence)}</Text>
            </>
          ) : (
            <Text className="mt-6 w-full text-center font-displayItalic text-display text-ink">{keepWords(card.front_phrase)}</Text>
          )}
          <Text className="mt-6 w-full text-center text-sm leading-6 text-muted">
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
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 6,
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
