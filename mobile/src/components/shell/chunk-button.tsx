import { Pressable, Text } from "react-native";
import { keepWords } from "@/lib/text";

const FACE = {
  primary: "bg-ember",
  moss: "bg-moss",
  ink: "bg-ink",
  ghost: "border border-line bg-card",
} as const;

const LABEL = {
  primary: "text-onEmber",
  moss: "text-onEmber",
  ink: "text-card",
  ghost: "text-ink",
} as const;

export function ChunkButton({
  label,
  onPress,
  disabled,
  tone = "primary",
  className = "",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: keyof typeof FACE;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-16 cursor-pointer items-center justify-center rounded-full px-10 active:opacity-90 ${disabled ? "bg-line" : FACE[tone]} ${className}`}
    >
      <Text className={`text-center font-label text-base ${disabled ? "text-ink" : LABEL[tone]}`}>{keepWords(label)}</Text>
    </Pressable>
  );
}
