import { Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import type { PlacementStatus } from "@/api/schemas/placement";
import {
  canStartPlacement,
  fillCopy,
  formatDay,
  languageLabel,
  nextTestDate,
  statusKind,
  type PlacementErrorKind,
} from "@/features/placement/model/placement-flow";
import type { PlacementCopy } from "@/lib/copy/placement";
import { HistoryList } from "./history-list";
import { LevelBadge, LoadingLine, PlacementNotice } from "./parts";

/**
 * Antes do teste: idioma, nível atual, se dá para medir agora (ou quando abre),
 * o teste aberto para retomar e o histórico.
 */
export function StatusPanel({
  t,
  bcp47,
  targetLang,
  throughLang,
  fallbackLevel,
  status,
  loading,
  error,
  starting,
  onReload,
  onStart,
  onHome,
}: {
  t: PlacementCopy;
  bcp47: string;
  targetLang: string;
  throughLang: string;
  fallbackLevel: string;
  status: PlacementStatus | null;
  loading: boolean;
  error: PlacementErrorKind | null;
  starting: boolean;
  onReload: () => void;
  onStart: () => void;
  onHome: () => void;
}) {
  const language = languageLabel(targetLang, bcp47, { capitalize: true });
  const through = languageLabel(throughLang, bcp47);
  const level = status?.current_level ?? fallbackLevel;
  const kind = status ? statusKind(status) : null;
  const opensOn = status && kind === "wait" ? nextTestDate(status) : null;

  let stateLine = "";
  if (kind === "open") {
    stateLine = t.stateOpen;
  } else if (kind === "never") {
    stateLine = t.stateNever;
  } else if (kind === "due") {
    stateLine = t.stateDue;
  } else if (kind === "wait") {
    stateLine = opensOn ? fillCopy(t.stateWait, { date: formatDay(opensOn, bcp47) }) : t.stateWaitUnknown;
  }

  const cta = kind === "open" ? t.resume : kind === "due" ? t.retake : t.start;
  const last = status?.last;

  return (
    <View className="gap-5" testID="placement-status">
      <TactileCard className="p-6" style={{ padding: 24 }}>
        <View className="gap-5">
          <View className="flex-row flex-wrap items-center gap-4">
            <Flag code={targetLang} size={44} />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-sans text-2xl font-black text-[#111C2D]">{language}</Text>
              <Text className="font-sans text-sm text-[#64748B]">{fillCopy(t.through, { lang: through })}</Text>
            </View>
            <View className="items-center gap-1">
              <LevelBadge level={level} size="md" testID="placement-current-level" />
              <Text className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{t.levelNow}</Text>
            </View>
          </View>

          {loading && !status ? <LoadingLine label={t.statusLoading} testID="placement-status-loading" /> : null}

          {error && !status ? (
            <PlacementNotice t={t} kind={error} title={t.statusFailed} onRetry={onReload} busy={loading} testID="placement-status-error" />
          ) : null}

          {status ? (
            <View className="gap-2">
              <Text testID="placement-status-line" className="font-sans text-base font-bold leading-6 text-[#111C2D]">
                {stateLine}
              </Text>
              {last?.result_level && last.finished_at ? (
                <Text className="font-sans text-sm text-[#64748B]">
                  {fillCopy(t.lastResult, { level: last.result_level, date: formatDay(last.finished_at, bcp47) })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {status && kind ? (
            <View className="flex-row flex-wrap items-center gap-3">
              {canStartPlacement(kind) ? (
                <View testID="placement-start-button">
                  <TactileButton variant="primary" size="lg" label={cta} disabled={starting} onPress={onStart} />
                </View>
              ) : (
                <View testID="placement-home-button">
                  <TactileButton variant="secondary" size="lg" label={t.backHome} onPress={onHome} />
                </View>
              )}
            </View>
          ) : null}
        </View>
      </TactileCard>

      <View className="gap-2 px-1">
        <Text className="font-sans text-sm leading-6 text-[#334155]">{t.dek}</Text>
        <Text className="font-sans text-sm leading-6 text-[#64748B]">{t.rules}</Text>
      </View>

      {status ? <HistoryList entries={status.history} t={t} bcp47={bcp47} /> : null}
    </View>
  );
}
