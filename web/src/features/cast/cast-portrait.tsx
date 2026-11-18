import { View, StyleSheet } from "react-native";
import { Figure } from "@/components/cast/figure";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";
import { mindById, type CastSlot, type MindId } from "@/design/minds";
import { mindCopy } from "@/lib/cast";
import { getLocale } from "@/lib/i18n";

export interface CastPortraitProps {
  who: MindId;
  slot?: CastSlot;
  size?: number;
  showRole?: boolean;
  showName?: boolean;
  testID?: string;
}

export function slotBg(palette: any, slot: CastSlot): string {
  switch (slot) {
    case "reading":
      return palette.castReading;
    case "memory":
      return palette.castMemory;
    case "speech":
      return palette.castSpeech;
    case "journal":
      return palette.castJournal;
    default:
      return palette.raised;
  }
}

export function CastPortrait({
  who,
  slot,
  size = 48,
  showRole = false,
  showName = false,
  testID = "cast-portrait",
}: CastPortraitProps) {
  const { palette } = useTheme();
  const mind = mindById(who);
  const effectiveSlot = slot ?? mind.slot;
  const bg = slotBg(palette, effectiveSlot);
  const copy = mindCopy(mind, getLocale());

  const figureSize = Math.round(size * 0.88);

  return (
    <View style={styles.container} testID={testID}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Figure who={who} size={figureSize} />
      </View>

      {(showRole || showName) && (
        <View style={styles.textCol}>
          {showRole && (
            <Text variant="caption" tone="muted" weight="medium">
              {copy.role}
            </Text>
          )}
          {showName && (
            <Text variant="body" weight="semibold" tone="ink">
              {mind.name}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  textCol: {
    alignItems: "center",
    gap: 1,
  },
});
