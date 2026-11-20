import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { IconCheck, IconClock, IconClose, IconLock } from "@/components/session/session-icons";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { formatClock } from "@/lib/lesson";
import { SESSION_PHASES, type PhaseStatus, type SessionPhaseId } from "@/lib/session-clock";
import { useTheme } from "@/theme/ThemeContext";

export function usePhaseLabel() {
  const copy = useAreaCopy(SESSION_COPY);
  return (id: SessionPhaseId): string =>
    ({
      review: copy.phaseReview,
      listen: copy.phaseListen,
      reading: copy.phaseReading,
      shadow: copy.phaseShadow,
      journal: copy.phaseJournal,
      note: copy.phaseNote,
    })[id];
}

/**
 * Cabeçalho tátil da sessão: sair, régua das 6 etapas (concluída, atual,
 * bloqueada) e o relógio real da sessão.
 */
export function SessionHeader({
  statuses,
  viewing,
  spans,
  elapsed,
  total,
  onSelect,
  onExit,
}: {
  statuses: Record<SessionPhaseId, PhaseStatus>;
  viewing: SessionPhaseId;
  spans: Record<SessionPhaseId, number>;
  elapsed: number;
  total: number;
  onSelect: (id: SessionPhaseId) => void;
  onExit: () => void;
}) {
  const { palette } = useTheme();
  const copy = useAreaCopy(SESSION_COPY);
  const label = usePhaseLabel();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const ratio = Math.max(0, Math.min(1, total > 0 ? elapsed / total : 0));

  return (
    <View
      className="w-full px-4 pb-3 pt-3 md:px-8"
      style={{ backgroundColor: palette.frame, borderBottomWidth: 1, borderBottomColor: palette.border }}
    >
      <View className="mx-auto w-full max-w-4xl flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.exit}
          onPress={onExit}
          className="h-11 w-11 cursor-pointer items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.card, borderWidth: 1.5, borderColor: palette.border, borderBottomWidth: 4, borderBottomColor: palette.control }}
        >
          <IconClose color={palette.ink} size={18} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <View accessibilityRole="tablist" className="flex-row gap-1.5">
            {SESSION_PHASES.map((id) => {
              const status = statuses[id];
              const active = viewing === id;
              const locked = status === "locked";
              const minutes = Math.max(1, Math.round(spans[id] / 60));
              const stateLabel = status === "done" ? copy.statusDone : status === "current" ? copy.statusNow : copy.statusLocked;
              const edge = status === "done" ? palette.primary : status === "current" ? palette.accent : palette.border;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="tab"
                  accessibilityLabel={`${label(id)}, ${stateLabel}, ${fill(copy.planned, { min: minutes })}`}
                  accessibilityHint={locked ? copy.lockedHint : undefined}
                  accessibilityState={{ selected: active, disabled: locked }}
                  disabled={locked}
                  onPress={() => onSelect(id)}
                  className={`min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-1 ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                  style={{
                    backgroundColor: active ? palette.active : status === "locked" ? palette.raised : palette.card,
                    borderWidth: 1.5,
                    borderColor: active ? palette.primary : palette.border,
                    borderBottomWidth: 4,
                    borderBottomColor: edge,
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  <View className="flex-row items-center gap-1">
                    {status === "done" ? (
                      <IconCheck color={palette.primary} size={13} />
                    ) : status === "locked" ? (
                      <IconLock color={palette.faint} size={12} />
                    ) : (
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.accent }} />
                    )}
                    {compact ? null : (
                      <Text
                        numberOfLines={1}
                        className={`font-sans text-xs ${active ? "font-extrabold text-ink" : "font-semibold text-muted"}`}
                      >
                        {label(id)}
                      </Text>
                    )}
                  </View>
                  {compact ? null : (
                    <Text className="font-sans text-[10px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                      {fill(copy.planned, { min: minutes })}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <View
          accessibilityRole="timer"
          accessibilityLabel={`${copy.clock}: ${formatClock(elapsed)} / ${formatClock(total)}`}
          className="flex-row items-center gap-1.5 rounded-xl px-3 py-2"
          style={{ backgroundColor: palette.card, borderWidth: 1.5, borderColor: palette.border, borderBottomWidth: 4 }}
        >
          <IconClock color={palette.primary} size={15} />
          <Text className="font-sans text-sm font-extrabold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
            {formatClock(elapsed)}
          </Text>
          {compact ? null : (
            <Text className="font-sans text-xs text-muted" style={{ fontVariant: ["tabular-nums"] }}>
              / {formatClock(total)}
            </Text>
          )}
        </View>
      </View>
      <View className="mx-auto mt-2 h-1.5 w-full max-w-4xl overflow-hidden rounded-full" style={{ backgroundColor: palette.raised }}>
        <View className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: palette.primary }} />
      </View>
      {compact ? (
        <Text className="mx-auto mt-1.5 w-full max-w-4xl font-sans text-xs font-bold text-ink">
          {label(viewing)} · {statuses[viewing] === "done" ? copy.statusDone : copy.statusNow}
        </Text>
      ) : null}
    </View>
  );
}
