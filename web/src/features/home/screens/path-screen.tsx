import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPlacementHistory } from "@/api/placement";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon, type TactileIconName } from "@/components/tactile/tactile-icon";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { bandStatus, newestFirst, shortDate, type BandStatus } from "@/features/home/model/home-model";
import { languageLabel, shellLayoutFor } from "@/features/shell/model/shell-model";
import { CEFR_BANDS, canDoFor, canDoText, type CanDoSkill, type CefrBand } from "@/lib/can-do";
import { useAreaCopy } from "@/lib/copy/area";
import { PATH_COPY, type PathCopy } from "@/lib/copy/path";
import { LOCALE_BCP47, useLocale, type DisplayLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

const SKILL_ICON: Record<CanDoSkill, TactileIconName> = {
  reading: "book",
  listening: "headphones",
  speaking: "mic",
  writing: "pen",
};

function skillName(skill: CanDoSkill, t: PathCopy): string {
  return skill === "reading" ? t.skillReading : skill === "listening" ? t.skillListening : skill === "speaking" ? t.skillSpeaking : t.skillWriting;
}

/**
 * Trilha (provisória): a jornada CEFR A1→C2 com os descritores "eu consigo", o nível atual
 * em destaque, os níveis acima bloqueados, o histórico real de nivelamento e o reteste.
 * Sem unidades inventadas: as unidades reais chegam no marco M2.
 */
export function PathScreen() {
  const t = useAreaCopy(PATH_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const session = useSession();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const phone = shellLayoutFor(width) === "phone";
  const target = session?.user.target_lang ?? "";

  const history = useQuery({
    queryKey: ["placement", "history", target],
    queryFn: ({ signal }) => fetchPlacementHistory(target, signal),
    enabled: Boolean(session && target),
    staleTime: 60_000,
  });

  if (!session) {
    return null;
  }
  const level = session.user.level;
  const entries = newestFirst(history.data ?? []);

  return (
    <ScrollView testID="path-screen" style={{ flex: 1, backgroundColor: tactile.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ width: "100%", maxWidth: 920, marginHorizontal: "auto", paddingHorizontal: phone ? 16 : 28, paddingTop: phone ? 18 : 28, paddingBottom: 40, gap: 20 } as object}>
        <View style={{ gap: 6 }}>
          <PanelKicker icon="route">{`${t.kicker} · ${t.course(languageLabel(target, bcp47))}`}</PanelKicker>
          <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: tactile.font, fontSize: phone ? 26 : 32, fontWeight: "800", letterSpacing: -0.5, color: tactile.ink }}>
            {t.title}
          </Text>
          <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body, maxWidth: 640 }}>{t.dek}</Text>
        </View>

        <View testID="path-levels" style={{ gap: 0 }}>
          {CEFR_BANDS.map((band, index) => (
            <BandNode key={band} band={band} status={bandStatus(band, level)} last={index === CEFR_BANDS.length - 1} t={t} locale={locale} />
          ))}
        </View>

        <TactilePanel tone="quiet" testID="path-units-note">
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <TactileIcon name="layers" size={18} color={tactile.muted} />
            <Text style={{ flex: 1, fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: tactile.body }}>{t.unitsSoon}</Text>
          </View>
        </TactilePanel>

        <View style={{ flexDirection: phone ? "column" : "row", gap: 16, alignItems: phone ? "stretch" : "flex-start" }}>
          <TactilePanel testID="path-history" style={{ flex: 3, minWidth: 0 }}>
            <PanelKicker icon="target">{t.historyTitle}</PanelKicker>
            {history.isPending && history.fetchStatus !== "idle" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color={tactile.primary} />
                <Text style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.muted }}>{t.historyLoading}</Text>
              </View>
            ) : history.isError && entries.length === 0 ? (
              <View style={{ gap: 10, alignItems: "flex-start" }}>
                <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.danger }}>
                  {t.historyError}
                </Text>
                <TactileButton label={t.retry} variant="secondary" size="sm" onPress={() => void history.refetch()} icon={<TactileIcon name="refresh" size={14} color={tactile.ink} />} />
              </View>
            ) : entries.length === 0 ? (
              <Text testID="path-history-empty" style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.muted }}>
                {t.historyEmpty}
              </Text>
            ) : (
              <View style={{ gap: 2 }}>
                {entries.map((entry, index) => (
                  <View
                    key={entry.id}
                    testID="path-history-row"
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: tactile.border }}
                  >
                    <View style={{ minWidth: 48, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: "center", backgroundColor: tactile.primarySoft }}>
                      <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "800", color: tactile.primaryInk }}>{entry.result_level}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "700", color: tactile.ink }}>
                        {entry.kind === "progress" ? t.kindProgress : t.kindPlacement}
                        {entry.previous_level && entry.previous_level !== entry.result_level ? ` · ${t.levelChange(entry.previous_level, entry.result_level)}` : ""}
                      </Text>
                      <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.muted }}>
                        {[shortDate(entry.finished_at, bcp47), t.score(entry.score), entry.item_count > 0 ? t.correct(entry.correct_count, entry.item_count) : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TactilePanel>

          <TactilePanel testID="path-retake" tone="accent" style={{ flex: 2, minWidth: 0 }}>
            <PanelKicker icon="refresh">{t.retakeTitle}</PanelKicker>
            <Text style={{ fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: tactile.body }}>{t.retakeDek}</Text>
            <View testID="path-retake-button">
              <TactileButton label={t.retakeCta} size="md" fullWidth onPress={() => router.push("/placement")} />
            </View>
          </TactilePanel>
        </View>
      </View>
    </ScrollView>
  );
}

function BandNode({ band, status, last, t, locale }: { band: CefrBand; status: BandStatus; last: boolean; t: PathCopy; locale: DisplayLocale }) {
  const [open, setOpen] = useState(status === "current");
  const current = status === "current";
  const locked = status === "locked";
  const items = canDoFor(band);
  const statusLabel = current ? t.current : locked ? t.locked : t.below;
  const listTitle = current ? t.canDoCurrent : locked ? t.canDoNext : t.canDoBelow;

  return (
    <View testID={`path-band-${band}`} style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ alignItems: "center", width: 52 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: current ? tactile.primary : locked ? tactile.raised : tactile.surface,
            borderWidth: 2,
            borderColor: current ? tactile.primaryDark : locked ? tactile.border : "#99D5CC",
            boxShadow: `0 4px 0 ${current ? tactile.primaryDark : locked ? tactile.border : "#99D5CC"}`,
          } as object}
        >
          {locked ? (
            <TactileIcon name="lock" size={20} color={tactile.faint} />
          ) : (
            <Text style={{ fontFamily: tactile.font, fontSize: 17, fontWeight: "800", color: current ? "#FFFFFF" : tactile.primaryInk }}>{band}</Text>
          )}
        </View>
        {last ? null : <View style={{ flex: 1, width: 4, minHeight: 18, marginVertical: 4, borderRadius: 2, backgroundColor: locked ? tactile.border : "#99D5CC" }} />}
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
        <View
          style={{
            borderRadius: 18,
            borderWidth: current ? 2 : 1.5,
            borderColor: current ? tactile.primary : tactile.border,
            backgroundColor: locked ? tactile.bg : tactile.surface,
            boxShadow: current ? `0 4px 0 ${tactile.primaryDark}` : `0 3px 0 ${tactile.border}`,
            padding: 16,
            gap: 10,
          } as object}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${band}, ${t.bands[band]}, ${statusLabel}`}
            onPress={() => setOpen((value) => !value)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer" } as object}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: tactile.font, fontSize: 17, fontWeight: "800", color: locked ? tactile.muted : tactile.ink }}>
                {locked ? `${band} · ${t.bands[band]}` : t.bands[band]}
              </Text>
              <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: current ? tactile.primaryInk : tactile.muted, marginTop: 2 }}>
                {statusLabel}
              </Text>
            </View>
            <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
              <TactileIcon name="chevronDown" size={18} color={tactile.muted} />
            </View>
          </Pressable>

          {locked && !open ? <Text style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.muted }}>{t.lockedHint}</Text> : null}

          {open ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.muted }}>{listTitle}</Text>
              {items.map((item) => (
                <View key={item.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <View accessibilityLabel={skillName(item.skill, t)} style={{ width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: locked ? tactile.raised : tactile.primarySoft }}>
                    <TactileIcon name={SKILL_ICON[item.skill]} size={15} color={locked ? tactile.muted : tactile.primaryInk} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: locked ? tactile.muted : tactile.body }}>{canDoText(item, locale)}</Text>
                </View>
              ))}
              {locked ? <Text style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.muted }}>{t.lockedHint}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
