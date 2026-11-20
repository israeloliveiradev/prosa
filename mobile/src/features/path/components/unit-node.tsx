import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";
import { useAreaCopy } from "@/lib/copy/area";
import { DUEL } from "@/lib/copy/duel";
import type { PathCopy } from "@/lib/copy/path";
import type { UnitView } from "@/features/path/model/path-model";
import { MasteryChecklist } from "./mastery-checklist";
import { CanDoList, FocusTags, StatusPill } from "./path-parts";

export interface UnitNodeProps {
  view: UnitView;
  /** Posição dentro da banda (1..8). */
  number: number;
  last: boolean;
  t: PathCopy;
  onStudy: (unitId: string) => void;
  onTest: (unitId: string) => void;
}

const NODE = 44;

function nodeColors(status: UnitView["status"]) {
  switch (status) {
    case "active":
      return { bg: tactile.primary, border: tactile.primaryDark, fg: "#FFFFFF", line: tactile.border };
    case "mastered":
      return { bg: tactile.success, border: "#065F46", fg: "#FFFFFF", line: "#6EE7B7" };
    case "validated":
      return { bg: tactile.primarySoft, border: "#99D5CC", fg: tactile.primaryInk, line: "#99D5CC" };
    default:
      return { bg: tactile.raised, border: tactile.border, fg: tactile.faint, line: tactile.border };
  }
}

/** Uma unidade no mapa: o nó à esquerda (com a linha até a próxima) e o cartão. */
export function UnitNode({ view, number, last, t, onStudy, onTest }: UnitNodeProps) {
  const { unit, status } = view;
  const [open, setOpen] = useState(view.expanded);
  const duel = useAreaCopy(DUEL);
  const colors = nodeColors(status);
  const active = status === "active";
  const locked = status === "locked";
  const done = status === "mastered" || status === "validated";
  const best = unit.mastery.test.best;

  return (
    <View testID={`path-unit-${unit.id}`} style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center", width: NODE }}>
        <View
          style={{
            width: NODE,
            height: NODE,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.bg,
            borderWidth: 2,
            borderColor: colors.border,
            boxShadow: `0 3px 0 ${colors.border}`,
          } as object}
        >
          {locked ? (
            <TactileIcon name="lock" size={17} color={colors.fg} />
          ) : done ? (
            <TactileIcon name="check" size={20} color={colors.fg} strokeWidth={3} />
          ) : (
            <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "800", color: colors.fg }}>{number}</Text>
          )}
        </View>
        {last ? null : <View style={{ flex: 1, width: 4, minHeight: 14, marginVertical: 4, borderRadius: 2, backgroundColor: colors.line }} />}
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 14 }}>
        <View
          testID={active ? "path-active-unit" : undefined}
          style={{
            borderRadius: 18,
            borderWidth: active ? 2 : 1.5,
            borderColor: active ? tactile.primary : tactile.border,
            backgroundColor: locked ? tactile.bg : active ? tactile.surface : tactile.surface,
            boxShadow: active ? `0 4px 0 ${tactile.primaryDark}` : locked ? "none" : `0 3px 0 ${tactile.border}`,
            padding: active ? 18 : 14,
            gap: active ? 14 : 8,
          } as object}
        >
          <Pressable
            disabled={active || locked}
            accessibilityRole={active || locked ? undefined : "button"}
            accessibilityState={active || locked ? { disabled: locked } : { expanded: open }}
            accessibilityLabel={`${t.unitNumber(number)}: ${unit.title}. ${locked && view.lockedBy ? t.lockedBy(view.lockedBy.title) : ""}`}
            onPress={() => setOpen((value) => !value)}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, cursor: active || locked ? "default" : "pointer" } as object}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: active ? tactile.primaryInk : tactile.muted }}>
                  {`${unit.band} · ${t.unitNumber(number)}`}
                </Text>
                <StatusPill status={status} t={t} testID={`path-unit-status-${unit.id}`} />
                {status === "mastered" && best !== null ? <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "700", color: tactile.success }}>{t.masteredBest(Math.round(best))}</Text> : null}
              </View>
              <Text
                accessibilityRole={active ? "header" : undefined}
                style={{
                  fontFamily: active ? tactile.serif : tactile.font,
                  fontSize: active ? 24 : 16,
                  lineHeight: active ? 30 : 22,
                  fontWeight: active ? "600" : "800",
                  color: locked ? tactile.muted : tactile.ink,
                }}
              >
                {unit.title}
              </Text>
            </View>
            {active || locked ? null : (
              <View style={{ paddingTop: 2, transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
                <TactileIcon name="chevronDown" size={18} color={tactile.muted} />
              </View>
            )}
          </Pressable>

          {active ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "800", color: tactile.muted }}>{t.canDoTitle}</Text>
              <CanDoList items={unit.can_do} />
            </View>
          ) : (
            <CanDoList items={unit.can_do} muted={locked} compact />
          )}

          {locked ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TactileIcon name="lock" size={13} color={tactile.muted} />
              <Text testID={`path-unit-lock-${unit.id}`} style={{ flex: 1, fontFamily: tactile.font, fontSize: 13, fontWeight: "600", color: tactile.muted }}>
                {view.lockedBy ? t.lockedBy(view.lockedBy.title) : t.lockedFirst}
              </Text>
            </View>
          ) : null}

          {active ? <FocusTags focus={unit.focus} t={t} /> : null}

          {(active || open) && unit.grammar && unit.grammar.name.trim() ? (
            <View testID={active ? "path-active-grammar" : undefined} style={{ gap: 4, padding: 12, borderRadius: 14, backgroundColor: tactile.raised, borderWidth: 1, borderColor: tactile.border }}>
              <Text style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: tactile.muted }}>{t.grammarTitle}</Text>
              <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "800", color: tactile.ink }}>{unit.grammar.name}</Text>
              {unit.grammar.examples[0] ? (
                <Text style={{ fontFamily: tactile.serif, fontSize: 17, lineHeight: 24, fontStyle: "italic", color: tactile.body }}>{unit.grammar.examples[0]}</Text>
              ) : null}
            </View>
          ) : null}

          {active ? <MasteryChecklist view={view} t={t} /> : null}

          {active ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 2 }}>
              <TactileButton
                testID="path-study-unit"
                label={t.studyCta}
                size="lg"
                onPress={() => onStudy(unit.id)}
                icon={<TactileIcon name="play" size={16} color="#FFFFFF" fill="#FFFFFF" />}
              />
              {view.canTest ? (
                <TactileButton
                  testID="path-take-test"
                  label={unit.mastery.test.best !== null ? t.testRetryCta : t.testCta}
                  variant="amber"
                  size="lg"
                  onPress={() => onTest(unit.id)}
                  icon={<TactileIcon name="target" size={16} color="#2A1700" />}
                />
              ) : null}
            </View>
          ) : null}

          {active ? (
            <View style={{ alignSelf: "flex-start" }}>
              <TactileButton
                testID="path-unit-duel"
                label={duel.unitLink}
                variant="secondary"
                size="sm"
                onPress={() => router.push({ pathname: "/duel", params: { unit: unit.id } })}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
