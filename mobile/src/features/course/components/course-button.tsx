import { Pressable, View, StyleSheet } from "react-native";
import { Flag } from "@/ui/flag";
import { Text } from "@/ui/text";
import { Pill } from "@/ui/pill";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";

export interface CourseButtonProps {
  compact?: boolean;
  onPress: () => void;
  testID?: string;
}

export function CourseButton({
  compact = false,
  onPress,
  testID = "course-switcher-btn",
}: CourseButtonProps) {
  const session = useSession();
  const { palette } = useTheme();

  if (!session) return null;

  const targetLang = session.user.target_lang;
  const level = session.user.level;
  const langName = languageName(targetLang);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Curso ativo: ${langName}, nível ${level}. Toque para trocar de idioma.`}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.button,
        {
          borderColor: palette.border,
          backgroundColor: pressed
            ? palette.active
            : hovered
            ? palette.raised
            : palette.sheet,
        },
      ]}
    >
      <Flag code={targetLang} size={compact ? 22 : 26} />
      {!compact && (
        <View style={styles.content}>
          <Text variant="body" weight="medium" tone="ink" numberOfLines={1}>
            {langName}
          </Text>
          <Pill label={level} tone="neutral" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    minHeight: 38,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
