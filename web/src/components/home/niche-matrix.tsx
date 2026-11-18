import { useState } from "react";
import { Text, View } from "react-native";
import { ActionRow } from "@/components/shell/action-row";
import type { LessonHistoryItem } from "@/lib/progress";

export function NicheMatrix({ history }: { history: LessonHistoryItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const niches = new Map<string, string[]>();
  for (const item of history) {
    const topic = item.topic.trim();
    if (!topic) {
      continue;
    }
    const words = niches.get(topic) ?? [];
    for (const entry of item.lesson.vocabulary) {
      if (!words.includes(entry.word)) {
        words.push(entry.word);
      }
    }
    niches.set(topic, words);
  }
  const rows = [...niches.entries()].slice(0, 8);
  const shown = open ? (niches.get(open) ?? []).slice(0, 8) : [];

  return (
    <View>
      <Text className="font-label text-sm text-muted">Vocabulário por tema</Text>
      {rows.length === 0 ? (
        <Text className="mt-3 text-base leading-6 text-muted">Os temas aparecem depois da primeira prosa.</Text>
      ) : (
        <View className="mt-3">
          {rows.map(([topic, words]) => {
            const selected = open === topic;
            return (
              <View key={topic} className="mt-3">
                <ActionRow
                  title={topic}
                  detail={`${words.length} ${words.length === 1 ? "palavra" : "palavras"}`}
                  label={`${topic}, ${words.length} palavras`}
                  onPress={() => setOpen(selected ? null : topic)}
                />
              </View>
            );
          })}
        </View>
      )}
      {shown.length > 0 ? (
        <View className="mt-4 rounded-[28px] border border-line bg-card px-4 py-3">
          {shown.map((word) => (
            <Text key={word} className="py-1 text-base text-ink">
              {word}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
