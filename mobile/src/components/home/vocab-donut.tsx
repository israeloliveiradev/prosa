import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";
import { motion } from "@/design/tokens";
import { useCopy } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";

const SIZE = 168;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function VocabDonut({ learning, mastered }: { learning: number; mastered: number }) {
  const { palette } = useTheme();
  const copy = useCopy();
  const total = learning + mastered;
  const grow = useSharedValue(0);
  const learningValue = useSharedValue(learning);
  const masteredValue = useSharedValue(mastered);

  useEffect(() => {
    learningValue.value = learning;
    masteredValue.value = mastered;
    grow.value = 0;
    grow.value = withTiming(1, { duration: motion.emphasized });
  }, [grow, learning, learningValue, mastered, masteredValue]);

  const learningProps = useAnimatedProps(() => {
    const sum = learningValue.value + masteredValue.value;
    const length = sum === 0 ? 0 : (learningValue.value / sum) * CIRCUMFERENCE * grow.value;
    return { strokeDasharray: `${length} ${CIRCUMFERENCE}` };
  });
  const masteredProps = useAnimatedProps(() => {
    const sum = learningValue.value + masteredValue.value;
    const learned = sum === 0 ? 0 : (learningValue.value / sum) * CIRCUMFERENCE;
    const length = sum === 0 ? 0 : (masteredValue.value / sum) * CIRCUMFERENCE * grow.value;
    return { strokeDasharray: `${length} ${CIRCUMFERENCE}`, strokeDashoffset: -learned * grow.value };
  });

  return (
    <View accessibilityLabel={`${learning} ${copy.learningNow}, ${mastered} ${copy.masteredNow}`} accessibilityRole="summary">
      <View className="relative self-start" style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <G transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={palette.outline} strokeWidth={STROKE} fill="none" />
            <AnimatedCircle animatedProps={learningProps} cx={SIZE / 2} cy={SIZE / 2} fill="none" r={RADIUS} stroke={palette.primary} strokeLinecap="round" strokeWidth={STROKE} />
            <AnimatedCircle animatedProps={masteredProps} cx={SIZE / 2} cy={SIZE / 2} fill="none" r={RADIUS} stroke={palette.secondary} strokeLinecap="round" strokeWidth={STROKE} />
          </G>
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-display text-display text-ink">{total}</Text>
          <Text className="text-sm text-muted">{copy.words}</Text>
        </View>
      </View>
      <View className="mt-6 gap-2">
        <Text className="text-base text-ink">{copy.learningNow} · {learning}</Text>
        <Text className="text-base text-ink">{copy.masteredNow} · {mastered}</Text>
      </View>
      {total === 0 ? <Text className="mt-3 text-base leading-6 text-muted">{copy.wordsAfterFirst}</Text> : null}
    </View>
  );
}
