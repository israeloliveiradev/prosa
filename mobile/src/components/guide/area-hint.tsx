import { Text, View } from "react-native";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { markGuideSeen, useGuideSeen, type GuideArea } from "@/lib/guide";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";

export function AreaHint({ area }: { area: Exclude<GuideArea, "welcome"> }) {
  const seen = useGuideSeen(area);
  const copy = useCopy();
  const { palette } = useTheme();
  if (seen) {
    return null;
  }
  const body = area === "prosa" ? copy.hintProsa : area === "news" ? copy.hintNews : area === "practice" ? copy.hintPractice : copy.hintMemory;
  return (
    <TactileCard
      animateEntry={false}
      style={{ backgroundColor: palette.accentSoft, borderColor: palette.accent, borderWidth: 1.5, borderRadius: 20, padding: 20 }}
    >
      {/* No web o TactileCard é um <div> comum: a View devolve o layout em coluna do React Native. */}
      <View>
        <Text className="font-sans text-xs font-extrabold uppercase tracking-widest text-accentInk">{copy.onThisScreen}</Text>
        <Text className="mt-2 font-sans text-base leading-7 text-ink">{body}</Text>
        <View className="mt-4 flex-row">
          <TactileButton
            variant="amber"
            size="md"
            onPress={() => {
              markGuideSeen(area);
              void tap("light");
            }}
            label={copy.gotIt}
          />
        </View>
      </View>
    </TactileCard>
  );
}
