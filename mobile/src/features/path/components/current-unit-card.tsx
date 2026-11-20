import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { PathResponse } from "@/api/schemas/path";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import type { PathCopy } from "@/lib/copy/path";
import { findUnit, unitIndexInBand } from "@/features/path/model/path-model";
import { CanDoList } from "./path-parts";
import { UnitChips } from "./unit-chips";

export interface CurrentUnitCardProps {
  t: PathCopy;
  level: string;
  path: { data: PathResponse | undefined; isPending: boolean; isError: boolean; fetchStatus: string; refetch: () => unknown };
  onSeePath: () => void;
}

/** Hoje: a unidade em curso (título, 1–2 metas e o resumo do domínio) e o atalho para a Trilha. */
export function CurrentUnitCard({ t, level, path, onSeePath }: CurrentUnitCardProps) {
  const data = path.data;
  const unit = data ? findUnit(data, data.current_unit_id) : null;
  const shownLevel = data?.level ?? level;

  return (
    <TactilePanel testID="home-unit">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: tactile.primary, boxShadow: `0 3px 0 ${tactile.primaryDark}` } as object}>
          <Text style={{ fontFamily: tactile.font, fontSize: 20, fontWeight: "800", color: "#FFFFFF" }}>{shownLevel}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <PanelKicker icon="route">{t.homeUnitKicker}</PanelKicker>
          {unit && data ? (
            <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "700", color: tactile.muted }}>{`${unit.band} · ${t.unitNumber(unitIndexInBand(data, unit))}`}</Text>
          ) : null}
        </View>
      </View>

      {path.isPending && path.fetchStatus !== "idle" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" color={tactile.primary} />
          <Text style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.muted }}>{t.homeUnitLoading}</Text>
        </View>
      ) : path.isError && !data ? (
        <View style={{ gap: 10, alignItems: "flex-start" }}>
          <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.danger }}>
            {t.homeUnitError}
          </Text>
          <TactileButton label={t.retry} variant="secondary" size="sm" onPress={() => void path.refetch()} icon={<TactileIcon name="refresh" size={14} color={tactile.ink} />} />
        </View>
      ) : unit ? (
        <View style={{ gap: 10 }}>
          <Text testID="home-unit-title" style={{ fontFamily: tactile.serif, fontSize: 22, lineHeight: 28, fontWeight: "600", color: tactile.ink }}>
            {unit.title}
          </Text>
          <CanDoList items={unit.can_do.slice(0, 2)} compact />
          <UnitChips unit={unit} t={t} testID="home-unit-chips" />
        </View>
      ) : data ? (
        <Text style={{ fontFamily: tactile.font, fontSize: 14, color: tactile.muted }}>{t.homeUnitNone}</Text>
      ) : null}

      <Pressable
        testID="home-see-path"
        accessibilityRole="link"
        onPress={onSeePath}
        hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 4, cursor: "pointer" } as object}
      >
        <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: tactile.primaryInk }}>{t.homeSeePath}</Text>
        <TactileIcon name="chevronRight" size={16} color={tactile.primaryInk} />
      </Pressable>
    </TactilePanel>
  );
}
