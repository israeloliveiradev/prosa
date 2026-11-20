import { Text, View } from "react-native";
import type { UnitStatus } from "@/api/schemas/path";
import { TactileIcon, type TactileIconName } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";
import type { PathCopy } from "@/lib/copy/path";

/** Peças visuais pequenas da Trilha, de Hoje e do teste. */

const SKILL_ICON: Record<string, TactileIconName> = {
  reading: "book",
  listening: "headphones",
  speaking: "mic",
  writing: "pen",
  grammar: "layers",
  vocab: "book",
};

export function skillLabel(skill: string, t: PathCopy): string | null {
  switch (skill) {
    case "reading":
      return t.skillReading;
    case "listening":
      return t.skillListening;
    case "speaking":
      return t.skillSpeaking;
    case "writing":
      return t.skillWriting;
    case "grammar":
      return t.skillGrammar;
    case "vocab":
    case "vocabulary":
      return t.skillVocab;
    default:
      return null;
  }
}

export function statusLabel(status: UnitStatus, t: PathCopy): string {
  return status === "active" ? t.statusActive : status === "mastered" ? t.statusMastered : status === "validated" ? t.statusValidated : t.statusLocked;
}

const STATUS_TONE: Record<UnitStatus, { bg: string; fg: string; border: string }> = {
  active: { bg: tactile.primary, fg: "#FFFFFF", border: tactile.primaryDark },
  mastered: { bg: tactile.successSoft, fg: tactile.success, border: "#A7F3D0" },
  validated: { bg: tactile.primarySoft, fg: tactile.primaryInk, border: "#99D5CC" },
  locked: { bg: tactile.raised, fg: tactile.muted, border: tactile.border },
};

export function StatusPill({ status, t, testID }: { status: UnitStatus; t: PathCopy; testID?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <View testID={testID} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.border }}>
      {status === "locked" ? <TactileIcon name="lock" size={11} color={tone.fg} strokeWidth={2.5} /> : status === "active" ? null : <TactileIcon name="check" size={11} color={tone.fg} strokeWidth={3} />}
      <Text style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase", color: tone.fg }}>{statusLabel(status, t)}</Text>
    </View>
  );
}

/** Etiqueta curta (habilidade, progresso). */
export function Tag({ label, icon, tone = "neutral", testID }: { label: string; icon?: TactileIconName; tone?: "neutral" | "teal" | "amber" | "green"; testID?: string }) {
  const colors =
    tone === "teal"
      ? { bg: tactile.primarySoft, fg: tactile.primaryInk, border: "#99D5CC" }
      : tone === "amber"
        ? { bg: tactile.amberSoft, fg: tactile.amber, border: "#FDE68A" }
        : tone === "green"
          ? { bg: tactile.successSoft, fg: tactile.success, border: "#A7F3D0" }
          : { bg: tactile.raised, fg: tactile.body, border: tactile.border };
  return (
    <View testID={testID} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
      {icon ? <TactileIcon name={icon} size={12} color={colors.fg} strokeWidth={2.5} /> : null}
      <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "700", color: colors.fg }}>{label}</Text>
    </View>
  );
}

export function FocusTags({ focus, t }: { focus: readonly string[]; t: PathCopy }) {
  const known = focus.map((skill) => ({ skill, label: skillLabel(skill, t) })).filter((entry): entry is { skill: string; label: string } => Boolean(entry.label));
  if (known.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel={`${t.focusTitle}: ${known.map((entry) => entry.label).join(", ")}`} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {known.map((entry) => (
        <Tag key={entry.skill} label={entry.label} icon={SKILL_ICON[entry.skill]} />
      ))}
    </View>
  );
}

/** Lista "eu consigo…" com marcadores. */
export function CanDoList({ items, muted = false, compact = false }: { items: readonly string[]; muted?: boolean; compact?: boolean }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: compact ? 4 : 8 }}>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, marginTop: compact ? 7 : 8, backgroundColor: muted ? tactile.faint : tactile.primary }} />
          <Text style={{ flex: 1, fontFamily: tactile.font, fontSize: compact ? 13 : 14, lineHeight: compact ? 19 : 21, color: muted ? tactile.muted : tactile.body }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** Barra de progresso com a marca da meta. */
export function MeterBar({ share, target, met, label }: { share: number; target?: number; met: boolean; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, share)) * 100);
  const mark = typeof target === "number" && target > 0 && target < 1 ? Math.round(target * 100) : null;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: pct }} style={{ height: 10, borderRadius: 999, backgroundColor: tactile.raised, borderWidth: 1, borderColor: tactile.border, overflow: "hidden", position: "relative" }}>
      <View style={{ width: `${pct}%`, height: "100%", borderRadius: 999, backgroundColor: met ? tactile.success : tactile.primary }} />
      {mark !== null ? <View style={{ position: "absolute", top: 0, bottom: 0, left: `${mark}%`, width: 2, marginLeft: -1, backgroundColor: tactile.ink, opacity: 0.45 }} /> : null}
    </View>
  );
}

/** Marcador de critério cumprido / por cumprir. */
export function CheckMark({ met, locked = false }: { met: boolean; locked?: boolean }) {
  if (met) {
    return (
      <View style={{ width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: tactile.success }}>
        <TactileIcon name="check" size={13} color="#FFFFFF" strokeWidth={3.2} />
      </View>
    );
  }
  return (
    <View style={{ width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: tactile.borderStrong, backgroundColor: tactile.surface }}>
      {locked ? <TactileIcon name="lock" size={11} color={tactile.faint} strokeWidth={2.5} /> : null}
    </View>
  );
}
