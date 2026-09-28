import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { keepWords } from "@/lib/text";

export function PageMasthead({
  kicker,
  title,
  dek,
  trailing,
}: {
  kicker: string;
  title: string;
  dek?: string;
  trailing?: ReactNode;
}) {
  return (
    <View>
      <Text className="font-label text-sm text-ember">{keepWords(kicker)}</Text>
      <Text className="font-displayItalic mt-3 text-display text-ink">{keepWords(title)}</Text>
      {dek ? <Text className="mt-3 max-w-xl text-lg leading-7 text-muted">{keepWords(dek)}</Text> : null}
      {trailing ? <View className="mt-6">{trailing}</View> : null}
    </View>
  );
}
