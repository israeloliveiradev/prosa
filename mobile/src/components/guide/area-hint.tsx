import { Pressable, Text, View } from "react-native";
import { markGuideSeen, useGuideSeen, type GuideArea } from "@/lib/guide";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";

export function AreaHint({ area }: { area: Exclude<GuideArea, "welcome"> }) {
  const seen = useGuideSeen(area);
  const copy = useCopy();
  if (seen) {
    return null;
  }
  const body = area === "prosa" ? copy.hintProsa : area === "news" ? copy.hintNews : area === "practice" ? copy.hintPractice : copy.hintMemory;
  return (
    <View className="rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-sm text-muted">{copy.onThisScreen}</Text>
      <Text className="mt-2 text-base leading-7 text-ink">{body}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          markGuideSeen(area);
          void tap("light");
        }}
        className="mt-4 min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6"
      >
        <Text className="text-base font-semibold text-onEmber">{copy.gotIt}</Text>
      </Pressable>
    </View>
  );
}
