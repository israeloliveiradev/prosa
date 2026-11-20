import { ActivityIndicator, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPlacementHistory } from "@/api/placement";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { newestFirst, shortDate } from "@/features/home/model/home-model";
import { BandSection } from "@/features/path/components/band-section";
import { MeterBar } from "@/features/path/components/path-parts";
import { buildPathView, dailyHref } from "@/features/path/model/path-model";
import { usePath, usePathFocusRefresh } from "@/features/path/model/use-path";
import { languageLabel, shellLayoutFor } from "@/features/shell/model/shell-model";
import { useAreaCopy } from "@/lib/copy/area";
import { PATH_COPY } from "@/lib/copy/path";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

/**
 * Trilha: o mapa linear de unidades por banda (A1 → C1), vindo de GET /path.
 * A unidade em curso aparece aberta, com a gramática, os critérios de domínio com os números
 * do servidor e os botões de estudar e de fazer o teste. Bloqueadas dizem por quê.
 */
export function PathScreen() {
  const t = useAreaCopy(PATH_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const session = useSession();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const layout = shellLayoutFor(width);
  const phone = layout === "phone";
  const contentWidth = width - (layout === "wide" ? 256 : layout === "rail" ? 96 : 0);
  const twoColumns = contentWidth >= 1000;
  const target = session?.user.target_lang ?? "";

  const path = usePath();
  usePathFocusRefresh(path);
  const history = useQuery({
    queryKey: ["placement", "history", target],
    queryFn: ({ signal }) => fetchPlacementHistory(target, signal),
    enabled: Boolean(session && target),
    staleTime: 60_000,
  });

  if (!session) {
    return null;
  }
  const level = path.data?.level ?? session.user.level;
  const view = path.data ? buildPathView(path.data) : null;
  const entries = newestFirst(history.data ?? []);
  const measuredByPlacement = entries.length > 0;

  const study = (unitId: string) => router.push(dailyHref(unitId) as Href);
  const test = (unitId: string) => router.push(`/unit-test?unit=${encodeURIComponent(unitId)}` as Href);
  const checkpoint = () => router.push("/checkpoint" as Href);

  const summary = view ? (
    <TactilePanel testID="path-summary" tone="accent">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: tactile.primary, boxShadow: `0 3px 0 ${tactile.primaryDark}` } as object}>
          <Text testID="path-level" style={{ fontFamily: tactile.font, fontSize: 20, fontWeight: "800", color: "#FFFFFF" }}>{level}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <PanelKicker icon="route">{t.levelChip(level)}</PanelKicker>
          <Text testID="path-units-done" style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "700", color: tactile.ink }}>
            {t.unitsDone(view.doneCount, view.total)}
          </Text>
        </View>
      </View>
      <MeterBar share={view.total > 0 ? view.doneCount / view.total : 0} met={view.total > 0 && view.doneCount === view.total} label={t.unitsDone(view.doneCount, view.total)} />
    </TactilePanel>
  ) : null;

  const map = (
    <View testID="path-map" style={{ gap: 18 }}>
      {path.isPending && path.fetchStatus !== "idle" ? (
        <TactilePanel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" color={tactile.primary} />
            <Text style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.muted }}>{t.loading}</Text>
          </View>
        </TactilePanel>
      ) : path.isError && !path.data ? (
        <TactilePanel testID="path-error">
          <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "700", color: tactile.danger }}>
            {t.error}
          </Text>
          <View style={{ alignSelf: "flex-start" }}>
            <TactileButton label={t.retry} variant="secondary" size="sm" onPress={() => void path.refetch()} icon={<TactileIcon name="refresh" size={14} color={tactile.ink} />} />
          </View>
        </TactilePanel>
      ) : view && view.bands.length === 0 ? (
        <TactilePanel testID="path-empty" tone="quiet">
          <Text style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.body }}>{t.empty}</Text>
        </TactilePanel>
      ) : view ? (
        view.bands.map((band) => (
          <BandSection
            key={`${band.band}-${band.kind}`}
            band={band}
            t={t}
            measuredByPlacement={measuredByPlacement}
            onStudy={study}
            onTest={test}
            onCheckpoint={checkpoint}
          />
        ))
      ) : null}
    </View>
  );

  const historyPanel = (
    <TactilePanel testID="path-history">
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
          {entries.slice(0, 6).map((entry, index) => (
            <View
              key={entry.id}
              testID="path-history-row"
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: tactile.border }}
            >
              <View style={{ minWidth: 44, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: "center", backgroundColor: tactile.primarySoft }}>
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
  );

  const retakePanel = (
    <TactilePanel testID="path-retake" tone="quiet">
      <PanelKicker icon="refresh">{t.retakeTitle}</PanelKicker>
      <Text style={{ fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: tactile.body }}>{t.retakeDek}</Text>
      <View testID="path-retake-button" style={{ alignSelf: phone ? "stretch" : "flex-start" }}>
        <TactileButton label={t.retakeCta} variant="secondary" size="md" fullWidth={phone} onPress={() => router.push("/placement")} />
      </View>
    </TactilePanel>
  );

  return (
    <ScrollView testID="path-screen" style={{ flex: 1, backgroundColor: tactile.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ width: "100%", maxWidth: 1180, marginHorizontal: "auto", paddingHorizontal: phone ? 16 : 28, paddingTop: phone ? 18 : 28, paddingBottom: 40, gap: 20 } as object}>
        <View style={{ gap: 6 }}>
          <PanelKicker icon="route">{`${t.kicker} · ${t.course(languageLabel(target, bcp47))}`}</PanelKicker>
          <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: tactile.font, fontSize: phone ? 26 : 32, fontWeight: "800", letterSpacing: -0.5, color: tactile.ink }}>
            {t.title}
          </Text>
          <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body, maxWidth: 680 }}>{t.dek}</Text>
        </View>

        {twoColumns ? (
          <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
            <View style={{ flex: 3, minWidth: 0 }}>{map}</View>
            <View style={{ flex: 2, minWidth: 0, maxWidth: 400, gap: 16 }}>
              {summary}
              {historyPanel}
              {retakePanel}
            </View>
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            {summary}
            {map}
            <View style={{ flexDirection: phone ? "column" : "row", gap: 16, alignItems: phone ? "stretch" : "flex-start" }}>
              <View style={{ flex: 1, minWidth: 0 }}>{historyPanel}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{retakePanel}</View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
