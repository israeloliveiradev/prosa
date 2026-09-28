import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { GlassSheet } from "@/components/session/glass-sheet";
import { fetchMnemonic } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { applySm2, type ReviewQuality } from "@/lib/sm2";
import type { SessionCard } from "@/lib/types";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

const GRADES: {
  quality: ReviewQuality;
  label: string;
  kind: "heavy" | "medium" | "light" | "success";
  background: string;
  color: string;
}[] = [
  { quality: 0, label: "Errei", kind: "heavy", background: "#F8D6DB", color: "#8E1B2C" },
  { quality: 3, label: "Difícil", kind: "medium", background: "#F0D2CB", color: "#6B2D2A" },
  { quality: 4, label: "Bom", kind: "light", background: "#DCE6D4", color: "#24301E" },
  { quality: 5, label: "Fácil", kind: "success", background: "#6B2D2A", color: "#FFF8F4" },
];

export function SrsStage({
  cards,
  onChange,
  heading = "Memória",
  doneTitle = "Deck de hoje concluído",
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
      setPalaceError("Entre na conta para abrir o palácio.");
      return;
    }
    setPalaceBusy(true);
    try {
      const result = await fetchMnemonic(session.token, card);
      if (!result.eligible || !result.association_text) {
        setPalaceError("Esta carta ainda acerta o bastante. O palácio abre quando a maioria das revisões falha.");
        return;
      }
      setPalaceText(result.association_text);
    } catch (caught) {
      setPalaceError(caught instanceof Error ? caught.message : "O palácio não abriu.");
    } finally {
      setPalaceBusy(false);
    }
  }

  function grade(quality: ReviewQuality, kind: (typeof GRADES)[number]["kind"]) {
    if (!card) {
      return;
    }
    void tap(kind);
    const nextCard = applySm2(card, quality);
    onChange(
      cards.map((item, index) => (index === cursor ? nextCard : item)),
      card,
      quality,
    );
    setNote(quality < 3 ? "De novo amanhã." : `Próxima revisão em ${nextCard.interval_days} ${nextCard.interval_days === 1 ? "dia" : "dias"}.`);
    setRevealed(false);
    setCursor((value) => value + 1);
  }

  if (done) {
    const mastered = cards.filter((item) => item.status === "mastered").length;
    return (
      <View className="border-t border-ink pt-6">
        <Text className="font-label text-xs uppercase tracking-widest text-ember">{heading}</Text>
        <Text className="font-displayItalic mt-2 text-headline text-ink">{doneTitle}</Text>
        <Text className="mt-3 text-base leading-6 text-muted">
          {cards.length} cartas revistas. {mastered} já entraram em dominadas.
        </Text>
        {note ? <Text className="mt-4 text-base font-semibold text-ink">{note}</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{heading}</Text>
      <Text className="mt-2 text-base text-muted">
        Carta {cursor + 1} de {cards.length}
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
          accessibilityLabel="Palácio da memória"
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
          <Text className="font-label text-base text-ink">Palácio</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Virar cartão"
        accessibilityHint="Depois de virar, arraste para a esquerda para errar e para a direita para fácil. Os botões abaixo fazem o mesmo."
        onPress={() => setRevealed((value) => !value)}
        className="mt-3 min-h-12 items-center justify-center self-start rounded-full border border-line bg-card px-5"
      >
        <Text className="font-label text-base text-ink">Virar cartão</Text>
      </Pressable>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {GRADES.map((gradeOption) => (
          <Pressable
            key={gradeOption.label}
            accessibilityRole="button"
            accessibilityLabel={`${gradeOption.label}, nota ${gradeOption.quality}`}
            accessibilityState={{ disabled: !revealed }}
            disabled={!revealed}
            onPress={() => grade(gradeOption.quality, gradeOption.kind)}
            className={`min-h-12 min-w-[46%] flex-1 items-center justify-center rounded-full px-3 ${gradeOption.quality === 5 ? "bg-ember" : ""}`}
            style={gradeOption.quality === 5 ? { opacity: revealed ? 1 : 0.4 } : { backgroundColor: gradeOption.background, opacity: revealed ? 1 : 0.4 }}
          >
            <Text className={`text-base font-semibold ${gradeOption.quality === 5 ? "text-onEmber" : ""}`} style={gradeOption.quality === 5 ? undefined : { color: gradeOption.color }}>
              {gradeOption.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {note ? <Text className="mt-3 text-sm text-muted">{note}</Text> : null}
      <GlassSheet visible={palaceOpen} onClose={() => setPalaceOpen(false)} label="Palácio da memória">
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
  const progress = useSharedValue(revealed ? 1 : 0);
  const drag = useSharedValue(0);

  useEffect(() => {
    progress.value = still ? withTiming(revealed ? 1 : 0, { duration: 1 }) : withSpring(revealed ? 1 : 0, { damping: 18, stiffness: 180 });
  }, [progress, revealed, still]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value }, { rotate: `${drag.value / 18}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [180, 360])}deg` }],
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
      <Animated.View className="mt-4 h-56" style={motion}>
        <Animated.View pointerEvents="none" className="absolute left-4 top-4 rounded-full bg-roseSoft px-3 py-2" style={leftHint}>
          <Text className="font-label text-sm text-roseInk">Errei</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" className="absolute right-4 top-4 rounded-full bg-mossSoft px-3 py-2" style={rightHint}>
          <Text className="font-label text-sm text-moss">Fácil</Text>
        </Animated.View>
        <Animated.View pointerEvents={revealed ? "none" : "auto"} className="border border-line bg-card" style={[styles.face, frontStyle]}>
          <Text className="text-center font-display text-3xl text-ink">{card.front_phrase}</Text>
          <Text className="mt-3 text-center text-sm text-muted">Toque em virar, ou arraste depois de ver a resposta</Text>
        </Animated.View>
        <Animated.View pointerEvents={revealed ? "auto" : "none"} className="bg-ink" style={[styles.face, backStyle]}>
          <Text className="text-center text-2xl font-semibold text-card">{card.back_translation}</Text>
          <Text className="mt-3 text-center text-base leading-6 text-emberSoft">{card.context_sentence}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  face: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backfaceVisibility: "hidden",
  },
});
