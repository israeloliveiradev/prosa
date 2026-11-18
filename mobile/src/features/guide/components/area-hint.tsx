import { View, StyleSheet } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { markGuideSeen, useGuideSeen, type GuideArea } from "@/lib/guide";
import { useCopy } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";

export interface AreaHintProps {
  area: Exclude<GuideArea, "welcome">;
  testID?: string;
}

export function AreaHint({ area, testID }: AreaHintProps) {
  const seen = useGuideSeen(area);
  const copy = useCopy();
  const { palette } = useTheme();

  if (seen) return null;

  const hintText =
    area === "prosa"
      ? copy.hintProsa
      : area === "news"
      ? copy.hintNews
      : area === "practice"
      ? copy.hintPractice
      : copy.hintMemory;

  const effectiveTestId = testID ?? `area-hint-${area}`;

  return (
    <View
      testID={effectiveTestId}
      style={[
        styles.container,
        {
          backgroundColor: palette.raised,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={{ gap: 4 }}>
        <Text variant="caption" weight="medium" tone="muted">
          {copy.onThisScreen ?? "Nesta tela"}
        </Text>
        <Text variant="body" tone="ink" style={{ lineHeight: 22 }}>
          {hintText}
        </Text>
      </View>

      <Button
        variant="secondary"
        size="sm"
        label={copy.gotIt ?? "Entendi"}
        onPress={() => markGuideSeen(area)}
        testID={`${effectiveTestId}-dismiss`}
        style={{ alignSelf: "flex-start", marginTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    width: "100%",
  },
});
