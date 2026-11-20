import { Text, View } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { TactileButton } from "@/components/tactile/tactile-button";
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
      <Text className="mt-2 font-display text-4xl font-extrabold text-ink">{word || token}</Text>
      {translation ? <Text className="mt-3 font-sans text-xl font-semibold text-ink">{translation}</Text> : null}
      {sentence ? <Text className="mt-3 font-serif text-lg leading-8 text-muted">{sentence}</Text> : null}
      {extra ? <Text className="mt-3 font-sans text-sm leading-6 text-muted">{keepWords(copy.extraWordNote)}</Text> : null}
      <View className="mt-6">
        <TactileButton
          variant={saved ? "secondary" : "primary"}
          size="lg"
          fullWidth
          disabled={saved}
          onPress={onSave}
          label={saved ? copy.alreadyInDeck : copy.saveToDeck}
        />
      </View>
    </GlassSheet>
  );
}
