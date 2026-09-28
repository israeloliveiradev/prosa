import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { useTheme } from "@/theme/ThemeContext";

export function ActionRow({
  title,
  detail,
  onPress,
  disabled,
  busy,
  label,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityHint={detail}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      disabled={disabled || busy}
      onPress={onPress}
      className="min-h-16 w-full cursor-pointer flex-row items-center rounded-3xl border border-line bg-card px-5 py-4"
    >
      <View className="min-w-0 flex-1 pr-4">
        <Text className="font-label text-base leading-6 text-ink">{title}</Text>
        {detail ? <Text className="mt-1 text-sm leading-5 text-muted">{detail}</Text> : null}
      </View>
      {busy ? <ActivityIndicator color={palette.primary} /> : <Icon name="chevron" color={palette.primary} />}
    </Pressable>
  );
}
