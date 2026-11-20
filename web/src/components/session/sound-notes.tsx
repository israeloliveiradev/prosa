import { Text, View } from "react-native";
import { useCopy, useLocale } from "@/lib/i18n";
import { localizeSoundNote } from "@/lib/pronunciation-contrasts";
import type { SoundNote } from "@/lib/types";
import { useTheme } from "@/theme/ThemeContext";

export function SoundNotes({ notes }: { notes: SoundNote[] }) {
  const ui = useCopy();
  const locale = useLocale();
  const { palette } = useTheme();
  if (notes.length === 0) {
    return null;
  }
  const focus = notes.find((note) => !note.held) ?? notes[0];
  const hint = focus ? localizeSoundNote(focus, locale).hint : "";
  return (
    <View className="mt-3 gap-2">
      {notes.map((note, index) => {
        const sound = localizeSoundNote(note, locale).sound;
        const line = note.held
          ? ui.soundHeld.replace("{sound}", sound).replace("{word}", note.word)
          : ui.soundSlipped.replace("{sound}", sound).replace("{word}", note.word).replace("{heard}", note.heard);
        return (
          <Text
            key={`${note.word}-${index}`}
            className="font-sans text-base leading-6"
            style={{ color: note.held ? palette.pillPositiveInk : palette.ink }}
          >
            {line}
          </Text>
        );
      })}
      {hint ? <Text className="font-sans text-sm leading-6 text-muted">{hint}</Text> : null}
    </View>
  );
}
