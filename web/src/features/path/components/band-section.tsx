import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";
import type { PathCopy } from "@/lib/copy/path";
import type { BandView } from "@/features/path/model/path-model";
import { UnitNode } from "./unit-node";

export interface BandSectionProps {
  band: BandView;
  t: PathCopy;
  /** Bandas validadas: "pelo nivelamento" só quando houve nivelamento de verdade. */
  measuredByPlacement: boolean;
  onStudy: (unitId: string) => void;
  onTest: (unitId: string) => void;
  onCheckpoint: () => void;
}

/** Uma banda CEFR da trilha: cabeçalho (recolhível), as unidades e o checkpoint no fim. */
export function BandSection({ band, t, measuredByPlacement, onStudy, onTest, onCheckpoint }: BandSectionProps) {
  const [open, setOpen] = useState(band.defaultOpen);
  const validated = band.kind === "validated";
  const current = band.kind === "current";
  const subtitle = validated
    ? `${measuredByPlacement ? t.bandValidatedPlacement : t.bandValidatedLevel} · ${t.bandUnits(band.total)}`
    : band.kind === "future"
      ? t.bandUnits(band.total)
      : t.bandProgress(band.doneCount, band.total);

  return (
    <View testID={`path-band-${band.band}`} style={{ gap: 12 }}>
      <Pressable
        testID={`path-band-toggle-${band.band}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${band.band}, ${t.bands[band.band]}. ${subtitle}`}
        onPress={() => setOpen((value) => !value)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: current ? "#99D5CC" : tactile.border,
          backgroundColor: validated ? tactile.primarySoft : current ? tactile.surface : tactile.raised,
          boxShadow: `0 3px 0 ${current || validated ? "#99D5CC" : tactile.border}`,
          cursor: "pointer",
        } as object}
      >
        <View
          style={{
            minWidth: 48,
            height: 44,
            paddingHorizontal: 8,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: current ? tactile.primary : validated ? tactile.surface : tactile.surface,
            borderWidth: 2,
            borderColor: current ? tactile.primaryDark : validated ? "#99D5CC" : tactile.border,
          }}
        >
          <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "800", color: current ? "#FFFFFF" : band.kind === "future" ? tactile.muted : tactile.primaryInk }}>{band.band}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 17, fontWeight: "800", color: band.kind === "future" ? tactile.body : tactile.ink }}>{t.bands[band.band]}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {validated ? <TactileIcon name="check" size={13} color={tactile.primaryInk} strokeWidth={3} /> : band.kind === "future" ? <TactileIcon name="lock" size={12} color={tactile.muted} /> : null}
            <Text testID={`path-band-subtitle-${band.band}`} style={{ flex: 1, fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: validated ? tactile.primaryInk : tactile.muted }}>
              {subtitle}
            </Text>
          </View>
          {band.kind === "future" && band.lockedBy && !open ? (
            <Text style={{ fontFamily: tactile.font, fontSize: 12, color: tactile.muted }}>{t.bandLockedBy(band.lockedBy.title)}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {current ? null : <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "800", color: tactile.primaryInk }}>{open ? t.hideUnits : t.showUnits}</Text>}
          <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
            <TactileIcon name="chevronDown" size={18} color={tactile.muted} />
          </View>
        </View>
      </Pressable>

      {open ? (
        <View style={{ paddingLeft: 4 }}>
          {band.units.map((view, index) => (
            <UnitNode
              key={view.unit.id}
              view={view}
              number={index + 1}
              last={index === band.units.length - 1 && !band.checkpoint}
              t={t}
              onStudy={onStudy}
              onTest={onTest}
            />
          ))}
          {band.checkpoint ? <CheckpointRow band={band} t={t} onStart={onCheckpoint} /> : null}
        </View>
      ) : band.checkpoint === "available" ? (
        <View style={{ paddingLeft: 4 }}>
          <CheckpointRow band={band} t={t} onStart={onCheckpoint} />
        </View>
      ) : null}
    </View>
  );
}

function CheckpointRow({ band, t, onStart }: { band: BandView; t: PathCopy; onStart: () => void }) {
  const state = band.checkpoint;
  if (!state) {
    return null;
  }
  const available = state === "available";
  const passed = state === "passed";
  return (
    <View testID={`path-checkpoint-${band.band}`} style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center", width: 44 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: "45deg" }],
            backgroundColor: passed ? tactile.success : available ? "#F59E0B" : tactile.raised,
            borderWidth: 2,
            borderColor: passed ? "#065F46" : available ? "#D97706" : tactile.border,
          }}
        >
          <View style={{ transform: [{ rotate: "-45deg" }] }}>
            {passed ? <TactileIcon name="check" size={18} color="#FFFFFF" strokeWidth={3} /> : available ? <TactileIcon name="target" size={18} color="#2A1700" /> : <TactileIcon name="lock" size={16} color={tactile.faint} />}
          </View>
        </View>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: available ? "#FCD34D" : tactile.border,
          backgroundColor: available ? tactile.amberSoft : tactile.bg,
          padding: 14,
          gap: 8,
        }}
      >
        <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "800", color: available ? tactile.amber : passed ? tactile.success : tactile.muted }}>{t.checkpointTitle(band.band)}</Text>
        <Text style={{ fontFamily: tactile.font, fontSize: 13, lineHeight: 19, color: tactile.body }}>{passed ? t.checkpointPassed : available ? t.checkpointAvailable : t.checkpointLocked}</Text>
        {available ? (
          <View style={{ alignSelf: "flex-start" }}>
            <TactileButton testID="path-checkpoint-start" label={t.checkpointCta} variant="amber" size="md" onPress={onStart} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
