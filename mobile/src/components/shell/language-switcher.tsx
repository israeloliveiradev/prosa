import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { activateStudyTrack, listStudyTracks, type StudyTrackChoice } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { languageName, trackLabel } from "@/lib/languages";
import { useProgress } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const copy = useCopy();
  const { palette } = useTheme();
  const session = useSession();
  const progress = useProgress();
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<StudyTrackChoice[]>([]);

  useEffect(() => {
    if (!session) {
      setTracks([]);
      return;
    }
    void listStudyTracks(session.token)
      .then(setTracks)
      .catch(() => setTracks([]));
  }, [session]);

  if (!session) {
    return null;
  }

  const label = `${languageName(session.user.target_lang)} · ${session.user.level}`;

  return (
    <View className="relative">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.language}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="min-h-12 cursor-pointer flex-row items-center gap-2 rounded-full border border-line bg-card px-4"
      >
        <Icon name="globe" color={palette.primary} />
        {compact ? null : <Text className="font-label text-sm text-ink">{label}</Text>}
        <Icon name="caret" color={palette.onSurfaceVariant} />
      </Pressable>
      {open ? (
        <View className="absolute right-0 top-14 z-50 min-w-64 rounded-3xl border border-line bg-card p-2">
          <Text className="px-3 py-2 font-label text-xs uppercase tracking-widest text-muted">{copy.language}</Text>
          {tracks.map((track) => {
            const active = session.user.target_lang === track.target_lang && session.user.native_lang === track.through_lang;
            return (
              <Pressable
                key={`${track.target_lang}-${track.through_lang}`}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!(progress.pro || session.user.plan === "pro") && !active) {
                    setOpen(false);
                    router.push("/paywall");
                    return;
                  }
                  void activateStudyTrack(session.token, track)
                    .then(() => {
                      rememberProfile({ target_lang: track.target_lang, native_lang: track.through_lang });
                      void tap("light");
                      setOpen(false);
                    })
                    .catch(() => undefined);
                }}
                className={`min-h-12 cursor-pointer justify-center rounded-2xl px-3 ${active ? "bg-emberSoft" : "bg-transparent"}`}
              >
                <Text className="font-label text-base text-ink">{trackLabel(track)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
