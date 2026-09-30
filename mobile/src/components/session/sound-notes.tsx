import { Text, View } from "react-native";
import { getLocale, useCopy } from "@/lib/i18n";
import type { SoundNote } from "@/lib/types";

export function SoundNotes({ notes }: { notes: SoundNote[] }) {
  const ui = useCopy();
  const locale = getLocale();
  if (notes.length === 0) {
    return null;
  }
  const hint = notes.find((note) => !note.held)?.hint[locale] ?? notes[0]?.hint[locale];
  return (
    <View className="mt-3 gap-2">
      {notes.map((note, index) => {
        const sound = note.sound[locale];
        const line = note.held
          ? ui.soundHeld.replace("{sound}", sound).replace("{word}", note.word)
          : ui.soundSlipped.replace("{sound}", sound).replace("{word}", note.word).replace("{heard}", note.heard);
        return (
          <Text key={`${note.word}-${index}`} className={`text-base leading-6 ${note.held ? "text-moss" : "text-ink"}`}>
            {line}
          </Text>
        );
      })}
      {hint ? <Text className="text-base leading-6 text-muted">{hint}</Text> : null}
    </View>
  );
}
