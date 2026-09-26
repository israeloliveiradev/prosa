import { Pressable, Text } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import type { VocabularyEntry } from "@/lib/types";

export function WordSheet({
  token,
  entry,
  saved,
  onClose,
  onSave,
}: {
  token: string | null;
  entry: VocabularyEntry | undefined;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <GlassSheet visible={token !== null} onClose={onClose} label="Tradução">
      <Text className="font-display mt-2 text-3xl text-ink">{entry?.word ?? token}</Text>
      {entry ? (
        <>
          <Text className="mt-3 text-xl text-ink">{entry.translation}</Text>
          <Text className="mt-3 text-base leading-6 text-muted">{entry.example_sentence}</Text>
        </>
      ) : (
        <Text className="mt-3 text-base leading-6 text-muted">Esta palavra não entrou no vocabulário de hoje.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !entry || saved }}
        disabled={!entry || saved}
        onPress={onSave}
        className={`mt-6 min-h-12 items-center justify-center rounded-full px-4 ${!entry || saved ? "bg-line" : "bg-ember"}`}
      >
        <Text className={`text-base font-semibold ${!entry || saved ? "text-muted" : "text-onEmber"}`}>
          {saved ? "Já está no deck" : "Salvar no deck"}
        </Text>
      </Pressable>
    </GlassSheet>
  );
}
