import { Pressable, Text } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { useCopy } from "@/lib/i18n";
import { keepWords } from "@/lib/text";

export function WordSheet({
  token,
  word,
  translation,
  sentence,
  extra,
  saved,
  onClose,
  onSave,
}: {
  token: string | null;
  word: string;
  translation: string;
  sentence: string;
  extra: boolean;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const copy = useCopy();
  return (
    <GlassSheet visible={token !== null} onClose={onClose} label={copy.guideWordTitle}>
      <Text className="font-display mt-2 text-3xl text-ink">{word || token}</Text>
      {translation ? <Text className="mt-3 text-xl text-ink">{keepWords(translation)}</Text> : null}
      {sentence ? <Text className="mt-3 text-base leading-6 text-muted">{keepWords(sentence)}</Text> : null}
      {extra ? <Text className="mt-3 text-base leading-6 text-muted">{keepWords(copy.extraWordNote)}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saved }}
        disabled={saved}
        onPress={onSave}
        className={`mt-6 min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${saved ? "bg-mossSoft" : "bg-ember"}`}
      >
        <Text className={`text-base font-semibold ${saved ? "text-moss" : "text-onEmber"}`}>
          {saved ? copy.alreadyInDeck : copy.saveToDeck}
        </Text>
      </Pressable>
    </GlassSheet>
  );
}
