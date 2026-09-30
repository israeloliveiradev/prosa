import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useCopy } from "@/lib/i18n";
import type { ClockHint, ProfileNote } from "@/lib/types";

export function NoteStage({
  reviewed,
  missed,
  tapped,
  spoke,
  wrote,
  done,
  note,
  clock,
  weeklyAim,
  onAim,
  onDuel,
  onTalk,
}: {
  reviewed: number;
  missed: number;
  tapped: number;
  spoke: boolean;
  wrote: boolean;
  done: boolean;
  note?: ProfileNote | null;
  clock?: ClockHint | null;
  weeklyAim?: string;
  onAim?: (aim: string) => void;
  onDuel: () => void;
  onTalk: () => void;
}) {
  const copy = useCopy();
  const [aim, setAim] = useState(weeklyAim ?? "");
  const strong = [
    reviewed > 0 && missed === 0 ? copy.noteMemoryHeld : "",
    spoke ? copy.noteSpeech : "",
    wrote ? copy.noteWrote : "",
  ].filter(Boolean);
  const weak = [
    missed > 0 ? copy.noteMemorySoft : "",
    tapped > 0 ? copy.noteWordsTouched : "",
    spoke ? "" : copy.noteSpeechSkipped,
    wrote ? "" : copy.noteQuiet,
  ].filter(Boolean);
  const tomorrow = whyTomorrow(copy, note, clock, missed > 0 || tapped > 0);

  return (
    <View className="mt-6">
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.note}</Text>
      <View className="mt-4">
        <Text className="font-label text-sm text-ink">{copy.noteStrong}</Text>
        <Text className="mt-2 text-base leading-7 text-muted">{strong[0] ?? copy.noteTomorrowPush}</Text>
      </View>
      <View className="mt-5">
        <Text className="font-label text-sm text-ink">{copy.noteWeak}</Text>
        <Text className="mt-2 text-base leading-7 text-muted">{weak[0] ?? copy.noteMemoryHeld}</Text>
      </View>
      <View className="mt-5">
        <Text className="font-label text-sm text-ink">{copy.noteTomorrow}</Text>
        <Text className="mt-2 text-base leading-7 text-ink">{tomorrow}</Text>
      </View>
      {onAim ? (
        <View className="mt-5">
          <Text className="font-label text-sm text-ink">{copy.weeklyAimLabel}</Text>
          <TextInput
            value={aim}
            onChangeText={setAim}
            placeholder={copy.weeklyAimPlaceholder}
            className="mt-2 min-h-12 rounded-2xl border border-line bg-card px-4 text-base text-ink"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => onAim(aim.trim())}
            className="mt-3 min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
          >
            <Text className="text-base font-semibold text-ink">{copy.weeklyAimSave}</Text>
          </Pressable>
        </View>
      ) : null}
      {done ? (
        <View className="mt-6 items-center">
          <Text className="text-center font-label text-base text-moss">{copy.twentyDone}</Text>
          <Pressable accessibilityRole="button" onPress={onDuel} className="mt-4 min-h-12 items-center justify-center rounded-full bg-ember px-6">
            <Text className="text-base font-semibold text-onEmber">{copy.duelCta}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onTalk} className="mt-3 min-h-12 items-center justify-center rounded-full bg-line px-6">
            <Text className="text-base font-semibold text-ink">{copy.talkAboutLesson}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function whyTomorrow(
  copy: ReturnType<typeof useCopy>,
  note: ProfileNote | null | undefined,
  clock: ClockHint | null | undefined,
  fallbackForce: boolean,
): string {
  if (clock?.slowStart) {
    return copy.noteForceHearing;
  }
  if (note?.force === "listen") {
    return copy.noteForceListen.replace("{gap}", String(Math.abs(note.gap)));
  }
  if (note?.force === "reading") {
    return copy.noteForceReading.replace("{gap}", String(Math.abs(note.gap)));
  }
  return fallbackForce ? copy.noteTomorrowForce : copy.noteTomorrowPush;
}
