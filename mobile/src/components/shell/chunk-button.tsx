import { Pressable, Text } from "react-native";

const FACE = {
  primary: "bg-ember",
  moss: "bg-moss",
  ghost: "border border-ink bg-card",
} as const;

const LABEL = {
  primary: "text-onEmber",
  moss: "text-onEmber",
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
      className={`min-h-14 cursor-pointer items-center justify-center rounded-full px-8 active:opacity-90 ${disabled ? "bg-line" : FACE[tone]} ${className}`}
    >
      <Text className={`text-center font-label text-base ${disabled ? "text-ink" : LABEL[tone]}`}>{label}</Text>
    </Pressable>
  );
}
