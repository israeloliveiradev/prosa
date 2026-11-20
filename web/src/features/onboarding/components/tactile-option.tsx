import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";

export interface TactileOptionProps {
  title: string;
  caption?: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  role?: "radio" | "checkbox";
  /** Chip compacto (temas) em vez de cartão. */
  compact?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Cartão selecionável com a borda inferior grossa do visual tátil: afunda ao
 * apertar e fica verde-água quando escolhido. Só primitivos RN.
 */
export function TactileOption({
  title,
  caption,
  selected,
  onPress,
  leading,
  trailing,
  role = "radio",
  compact = false,
  disabled = false,
  accessibilityLabel,
  testID,
}: TactileOptionProps) {
  const { palette } = useTheme();
  const [pressed, setPressed] = useState(false);
  const sunk = pressed && !disabled;

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ checked: selected, selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={[
        compact ? styles.chip : styles.card,
        {
          backgroundColor: selected ? palette.primarySoft : palette.card,
          borderColor: selected ? palette.primary : palette.line,
          borderBottomColor: selected ? palette.primaryEdge : palette.outline,
          borderBottomWidth: sunk ? 1.5 : 4,
          marginTop: sunk ? 2.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        Platform.OS === "web" ? ({ cursor: disabled ? "not-allowed" : "pointer", userSelect: "none" } as object) : null,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text variant={compact ? "body-sm" : "body"} weight={selected ? "bold" : "semibold"} tone="ink">
          {title}
        </Text>
        {caption ? (
          <Text variant="body-sm" tone="muted" style={styles.caption}>
            {caption}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  leading: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  caption: {
    lineHeight: 18,
  },
  trailing: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
