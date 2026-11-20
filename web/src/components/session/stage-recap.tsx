import { Text, View } from "react-native";
import { IconCheck } from "@/components/session/session-icons";
import { StageCard } from "@/components/session/stage-kit";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { useCopy } from "@/lib/i18n";
import { ratedTotal, type DailyRun, type SessionPhaseId } from "@/lib/session-clock";
import { useTheme } from "@/theme/ThemeContext";

/** O que ficou de uma etapa já concluída (somente leitura, só dados reais). */
export function StageRecap({ phase, run }: { phase: SessionPhaseId; run: DailyRun }) {
  const local = useAreaCopy(SESSION_COPY);
  const copy = useCopy();
  const { palette } = useTheme();
  const lines: string[] = [];

  if (phase === "review") {
    lines.push(fill(local.recapReview, { count: ratedTotal(run) }));
    if (ratedTotal(run) > 0) {
      lines.push(
        `${copy.gradeMissed} ${run.ratings.again} · ${copy.gradeHard} ${run.ratings.hard} · ${copy.gradeGood} ${run.ratings.good} · ${copy.gradeEasy} ${run.ratings.easy}`,
      );
    }
  }
  if (phase === "listen") {
    lines.push(run.listen && run.listen.total > 0 ? fill(local.recapListen, { right: run.listen.right, total: run.listen.total }) : local.recapListenHeard);
  }
  if (phase === "reading") {
    lines.push(fill(local.recapReading, { tapped: run.reading.tapped, saved: run.savedWords }));
  }
  if (phase === "shadow") {
    if (run.shadow.best !== null) {
      lines.push(fill(local.recapShadow, { score: run.shadow.best }));
    }
    if (run.shadow.wpm !== null) {
      lines.push(fill(local.recapFluency, { wpm: run.shadow.wpm }));
    }
    if (run.shadow.best === null && run.shadow.wpm === null && run.shadow.skipped) {
      lines.push(local.speechSkipped);
    }
  }
  if (phase === "journal") {
    if (run.rebuild) {
      lines.push(fill(local.recapRebuild, { score: run.rebuild.score }));
    }
    if (run.journal) {
      lines.push(fill(local.recapJournal, { score: run.journal.score }));
    }
  }

  return (
    <StageCard tone="raised">
      <View className="flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: palette.primary }}>
          <IconCheck color={palette.onPrimary} size={13} />
        </View>
        <Text className="flex-1 font-sans text-sm font-bold text-muted">{local.reviewingPast}</Text>
      </View>
      {lines.map((line) => (
        <Text key={line} className="mt-3 font-sans text-base font-semibold leading-6 text-ink" style={{ fontVariant: ["tabular-nums"] }}>
          {line}
        </Text>
      ))}
    </StageCard>
  );
}
