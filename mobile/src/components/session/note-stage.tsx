import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Kicker, Notice, StageCard, StatTile } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { useCopy } from "@/lib/i18n";
import { formatClock } from "@/lib/lesson";
import type { RatingBucket } from "@/lib/session-clock";
import type { ClockHint, ProfileNote } from "@/lib/types";
import { useTheme } from "@/theme/ThemeContext";

export interface SessionSummary {
  ratings: Record<RatingBucket, number>;
  elapsed: number;
  tapped: number;
  savedWords: number;
  speechBest: number | null;
  fluencyWpm: number | null;
  speechSkipped: boolean;
  journalScore: number | null;
  rebuildScore: number | null;
  xp: number;
}

export function NoteStage({
  summary,
  streak,
  finished,
  note,
  clock,
  weeklyAim,
  onAim,
  onFinish,
  onHome,
  onTalk,
}: {
  summary: SessionSummary;
  /** Dias seguidos já com a sessão de hoje (vem do progresso local real). */
  streak: number;
  finished: boolean;
  note?: ProfileNote | null;
  clock?: ClockHint | null;
  weeklyAim?: string;
  onAim?: (aim: string) => Promise<void>;
  onFinish: () => void;
  onHome: () => void;
  onTalk: () => void;
}) {
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const { palette } = useTheme();
  const [aim, setAim] = useState(weeklyAim ?? "");
  const [aimState, setAimState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const reviewed = summary.ratings.again + summary.ratings.hard + summary.ratings.good + summary.ratings.easy;
  const missed = summary.ratings.again;
  const spoke = summary.speechBest !== null || summary.fluencyWpm !== null;
  const wrote = summary.journalScore !== null || summary.rebuildScore !== null;

  useEffect(() => {
    if (weeklyAim !== undefined) {
      setAim((current) => (current.trim() ? current : weeklyAim));
    }
  }, [weeklyAim]);

  const strong = [reviewed > 0 && missed === 0 ? copy.noteMemoryHeld : "", spoke ? copy.noteSpeech : "", wrote ? copy.noteWrote : ""].filter(Boolean);
  const weak = [
    missed > 0 ? copy.noteMemorySoft : "",
    summary.tapped > 0 ? copy.noteWordsTouched : "",
    spoke ? "" : copy.noteSpeechSkipped,
    wrote ? "" : copy.noteQuiet,
  ].filter(Boolean);
  const tomorrow = whyTomorrow(copy, note, clock, missed > 0 || summary.tapped > 0);
  const journalValue =
    summary.journalScore !== null ? String(summary.journalScore) : summary.rebuildScore !== null ? String(summary.rebuildScore) : local.summaryNone;
  const speechValue =
    summary.speechBest !== null
      ? String(summary.speechBest)
      : summary.fluencyWpm !== null
        ? fill(local.recapFluency, { wpm: summary.fluencyWpm })
        : summary.speechSkipped
          ? local.summarySkipped
          : local.summaryNone;

  const buckets: Array<{ key: RatingBucket; label: string; color: string }> = [
    { key: "again", label: copy.gradeMissed, color: palette.negative },
    { key: "hard", label: copy.gradeHard, color: palette.warning },
    { key: "good", label: copy.gradeGood, color: palette.controlStrong },
    { key: "easy", label: copy.gradeEasy, color: palette.primary },
  ];

  return (
    <View className="gap-4">
      <StageCard>
        <Kicker>{local.summaryTitle}</Kicker>
        <View className="mt-4 flex-row flex-wrap gap-3">
          <StatTile label={local.summaryCards} value={String(reviewed)} />
          <StatTile label={local.summaryTime} value={formatClock(summary.elapsed)} />
          <StatTile label={local.summaryWords} value={String(summary.savedWords)} />
          <StatTile label={local.summaryJournal} value={journalValue} />
          <StatTile label={local.summarySpeech} value={speechValue} />
          <StatTile label={local.summaryXp} value={String(summary.xp)} />
        </View>
        {reviewed > 0 ? (
          <View className="mt-5">
            <Text className="font-sans text-xs font-bold uppercase tracking-wider text-muted">{local.summaryRatings}</Text>
            <View accessibilityRole="summary" className="mt-2 h-3 flex-row overflow-hidden rounded-full" style={{ backgroundColor: palette.raised }}>
              {buckets.map((bucket) =>
                summary.ratings[bucket.key] > 0 ? (
                  <View key={bucket.key} style={{ flex: summary.ratings[bucket.key], backgroundColor: bucket.color }} />
                ) : null,
              )}
            </View>
            <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
              {buckets.map((bucket) => (
                <View key={bucket.key} className="flex-row items-center gap-1.5">
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                  <Text className="font-sans text-sm text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                    {bucket.label} · {summary.ratings[bucket.key]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </StageCard>

      <StageCard tone="raised">
        <Text className="font-sans text-sm font-extrabold text-ink">{copy.noteStrong}</Text>
        <Text className="mt-1 font-sans text-base leading-7 text-muted">{strong[0] ?? copy.noteTomorrowPush}</Text>
        {weak[0] ? (
          <>
            <Text className="mt-4 font-sans text-sm font-extrabold text-ink">{copy.noteWeak}</Text>
            <Text className="mt-1 font-sans text-base leading-7 text-muted">{weak[0]}</Text>
          </>
        ) : null}
        <Text className="mt-4 font-sans text-sm font-extrabold text-ink">{copy.noteTomorrow}</Text>
        <Text className="mt-1 font-sans text-base leading-7 text-ink">{tomorrow}</Text>
      </StageCard>

      {onAim ? (
        <StageCard>
          <Text className="font-sans text-sm font-extrabold text-ink">{copy.weeklyAimLabel}</Text>
          <TextInput
            value={aim}
            onChangeText={(value) => {
              setAim(value);
              setAimState("idle");
            }}
            placeholder={copy.weeklyAimPlaceholder}
            placeholderTextColor={palette.faint}
            accessibilityLabel={copy.weeklyAimLabel}
            className="mt-2 min-h-12 rounded-xl px-4 font-sans text-base text-ink"
            style={{ backgroundColor: palette.raised, borderWidth: 2, borderColor: palette.border }}
          />
          <View className="mt-3 flex-row">
            <TactileButton
              variant="secondary"
              size="md"
              disabled={aimState === "saving" || aim.trim().length === 0}
              onPress={() => {
                setAimState("saving");
                void onAim(aim.trim())
                  .then(() => setAimState("saved"))
                  .catch(() => setAimState("failed"));
              }}
              label={copy.weeklyAimSave}
            />
          </View>
          {aimState === "saved" ? <Notice tone="success">{local.aimSaved}</Notice> : null}
          {aimState === "failed" ? <Notice>{local.aimFailed}</Notice> : null}
        </StageCard>
      ) : null}

      {finished ? (
        <StageCard>
          <Notice tone="success">{local.savedDone}</Notice>
          <View className="mt-4 flex-row flex-wrap gap-3">
            <StatTile label={local.summaryStreak} value={String(streak)} />
          </View>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <TactileButton variant="primary" size="lg" onPress={onHome} label={local.backHome} />
            <TactileButton variant="secondary" size="lg" onPress={onTalk} label={local.talkNext} />
          </View>
        </StageCard>
      ) : (
        <View className="flex-row">
          <TactileButton variant="primary" size="xl" onPress={onFinish} label={local.finishSave} />
        </View>
      )}
    </View>
  );
}

function whyTomorrow(
  copy: ReturnType<typeof useCopy>,
  note: ProfileNote | null | undefined,
  clock: ClockHint | null | undefined,
  fallbackForce: boolean,
): string {
  if (clock?.slowStart) {
    return copy.noteForceHearing;
  }
  if (note?.force === "listen") {
    return copy.noteForceListen.replace("{gap}", String(Math.abs(note.gap)));
  }
  if (note?.force === "reading") {
    return copy.noteForceReading.replace("{gap}", String(Math.abs(note.gap)));
  }
  return fallbackForce ? copy.noteTomorrowForce : copy.noteTomorrowPush;
}
