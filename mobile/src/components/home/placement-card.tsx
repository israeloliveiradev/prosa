import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { fetchPlacementStatus, type PlacementStatus } from "@/lib/api";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function PlacementCard() {
  const copy = useCopy();
  const session = useSession();
  const [status, setStatus] = useState<PlacementStatus | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let active = true;
    void fetchPlacementStatus(session.token)
      .then((next) => {
        if (active) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (active) {
          setStatus(null);
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  if (!session) {
    return null;
  }

  const detail = status?.last
    ? status.due
      ? copy.placeDue
      : fill(copy.placeWait, { days: status.days_until ?? 0 })
    : copy.placeNever;
  const cta = status?.open_attempt_id ? copy.placeContinue : status?.last ? (status.due ? copy.placeRetake : copy.placeTitle) : copy.placeStart;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.placeTitle}. ${detail}`}
      onPress={() => router.push("/placement" as Href)}
      className="cursor-pointer rounded-[28px] border border-line bg-card px-5 py-6"
    >
      <View className="flex-row items-center gap-3">
        <Flag code={session.user.target_lang} size={34} />
        <View className="min-w-0 flex-1">
          <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.placeKicker}</Text>
          <Text className="font-displayItalic mt-1 text-3xl text-ink">
            {languageName(session.user.target_lang)} · {status?.last?.result_level ?? session.user.level}
          </Text>
        </View>
      </View>
      <Text className="mt-4 text-base leading-6 text-muted">{detail}</Text>
      {status && status.history.length > 1 ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {status.history.slice(-6).map((entry) => (
            <View key={entry.id} className="rounded-full bg-emberSoft px-3 py-1">
              <Text className="font-label text-xs text-ink">{entry.result_level}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text className="mt-5 font-label text-base text-ember">{cta}</Text>
    </Pressable>
  );
}
