import { ActivityIndicator } from "react-native";
import { ListRow } from "@/ui";
import { useThemeTokens } from "@/theme/ThemeContext";

export function ActionRow({
  title,
  detail,
  onPress,
  disabled,
  busy,
  label: _label,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
}) {
  const { colors } = useThemeTokens();

  return (
    <ListRow
      title={title}
      subtitle={detail}
      onPress={disabled || busy ? undefined : onPress}
      chevron={!busy}
      trailing={
        busy ? (
          <ActivityIndicator
            color={colors.accent.brand}
            accessibilityLabel="Carregando..."
            aria-label="Carregando..."
          />
        ) : undefined
      }
    />
  );
}
