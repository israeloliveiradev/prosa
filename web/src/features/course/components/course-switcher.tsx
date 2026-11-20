import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { activateStudyTrack, listStudyTracks } from "@/api/study";
import { Flag } from "@/components/shell/flag";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { TactileMenu, TactileMenuDivider, TactileMenuHeading, TactileMenuItem } from "@/components/tactile/tactile-menu";
import { tactile } from "@/components/tactile/tokens";
import { languageLabel, orderTracks, type TrackLike } from "@/features/shell/model/shell-model";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { dropForeignGlosses, switchProgressLang } from "@/lib/progress";
import { refreshSession, rememberProfile, useSession } from "@/lib/session";

type Load = { state: "idle" | "loading" | "ready" | "error"; tracks: TrackLike[] };

/**
 * Seletor de curso do cabeçalho: bandeira + idioma + nível. Lista os cursos da conta
 * (GET /study/tracks), troca com POST /study/activate e atualiza a sessão.
 */
export function CourseSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useAreaCopy(SHELL_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const session = useSession();
  const router = useRouter();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ state: "idle", tracks: [] });
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState(false);

  const user = session?.user;

  const fetchTracks = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoad((current) => ({ state: "loading", tracks: current.tracks }));
    try {
      const tracks = await listStudyTracks();
      setLoad({ state: "ready", tracks: orderTracks(tracks, user) });
    } catch {
      setLoad({ state: "error", tracks: [] });
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      setSwitchError(false);
      void fetchTracks();
    }
  }, [open, fetchTracks]);

  if (!user) {
    return null;
  }

  const name = languageLabel(user.target_lang, bcp47);

  async function choose(track: TrackLike) {
    if (track.active || switching) {
      setOpen(false);
      return;
    }
    setSwitching(track.target_lang);
    setSwitchError(false);
    try {
      const saved = await activateStudyTrack({ target_lang: track.target_lang, through_lang: track.through_lang, level: track.level });
      const level = (["A1", "A2", "B1", "B2", "C1", "C2"] as const).find((item) => item === saved.level) ?? user!.level;
      rememberProfile({ target_lang: saved.target_lang, native_lang: saved.through_lang, level });
      switchProgressLang(saved.target_lang);
      dropForeignGlosses(saved.through_lang);
      await refreshSession();
      setOpen(false);
    } catch {
      setSwitchError(true);
    } finally {
      setSwitching(null);
    }
  }

  return (
    <View ref={anchor} collapsable={false} style={{ flexShrink: 1, minWidth: 0 }}>
      <Pressable
        testID="course-switcher-btn"
        accessibilityRole="button"
        accessibilityLabel={t.openCourses(name, user.level)}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ hovered }: { hovered?: boolean }) =>
          ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 40,
            paddingVertical: 6,
            paddingLeft: 8,
            paddingRight: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: tactile.border,
            backgroundColor: hovered ? tactile.raised : tactile.surface,
            boxShadow: `0 2px 0 ${tactile.borderStrong}`,
            cursor: "pointer",
            maxWidth: "100%",
          }) as object
        }
      >
        <Flag code={user.target_lang} size={22} />
        {compact ? null : (
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: tactile.ink }}>
            {name}
          </Text>
        )}
        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: tactile.primarySoft }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", color: tactile.primaryInk }}>{user.level}</Text>
        </View>
        <TactileIcon name="chevronDown" size={14} color={tactile.muted} />
      </Pressable>

      <TactileMenu open={open} onClose={() => setOpen(false)} anchor={anchor} align="left" width={320} label={t.coursesTitle} testID="course-sheet">
        <TactileMenuHeading>{t.coursesTitle}</TactileMenuHeading>
        {load.state === "loading" && load.tracks.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}>
            <ActivityIndicator size="small" color={tactile.primary} />
            <Text style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.muted }}>{t.coursesLoading}</Text>
          </View>
        ) : null}
        {load.state === "error" ? (
          <View style={{ gap: 8, padding: 10 }}>
            <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.danger }}>
              {t.coursesError}
            </Text>
            <TactileMenuItem icon="refresh" label={t.retry} onPress={() => void fetchTracks()} tone="accent" />
          </View>
        ) : null}
        {load.tracks.map((track) => (
          <TactileMenuItem
            key={track.target_lang}
            testID={`course-item-${track.target_lang}`}
            leading={<Flag code={track.target_lang} size={24} />}
            label={languageLabel(track.target_lang, bcp47)}
            detail={switching === track.target_lang ? t.switching : `${t.level(track.level)} · ${t.support(languageLabel(track.through_lang, bcp47))}`}
            selected={track.active}
            disabled={Boolean(switching)}
            onPress={() => void choose(track)}
          />
        ))}
        {switchError ? (
          <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.danger, paddingHorizontal: 10, paddingVertical: 6 }}>
            {t.switchError}
          </Text>
        ) : null}
        <TactileMenuDivider />
        <TactileMenuItem
          testID="course-add-btn"
          icon="plus"
          label={t.addLanguage}
          tone="accent"
          onPress={() => {
            setOpen(false);
            router.push("/quiz");
          }}
        />
      </TactileMenu>
    </View>
  );
}
