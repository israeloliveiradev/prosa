import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ShadowStage } from "@/components/session/shadow-stage";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { usePath } from "@/features/path/model/use-path";
import { useAreaCopy } from "@/lib/copy/area";
import { PRONUNCIATION } from "@/lib/copy/pronunciation";
import { useProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { ErrorPanel, PracticePage } from "../components/practice-header";
import { pickSentences } from "../model/practice-model";

/**
 * Laboratório de pronúncia: ShadowStage (e o HvptRound do dia, que ele inclui) com frases das
 * lições recentes ou, sem lições, dos exemplos de gramática da unidade atual. Silêncio vale 0.
 */
export function PronunciationScreen() {
  const session = useSession();
  const t = useAreaCopy(PRONUNCIATION);
  const progress = useProgress();
  const lessons = useMemo(() => {
    const items = progress.history.map((entry) => ({ lesson: entry.lesson }));
    return progress.cachedLesson && items.length === 0 ? [{ lesson: progress.cachedLesson }] : items;
  }, [progress.history, progress.cachedLesson]);
  const fromLessons = useMemo(() => pickSentences(lessons, null), [lessons]);
  const needsPath = fromLessons.origin === "none";
  const path = usePath({ enabled: needsPath });

  if (!session) {
    return <Redirect href="/account" />;
  }

  const language = session.user.target_lang ?? "en";
  const through = session.user.native_lang ?? "pt";
  const picked = needsPath ? pickSentences([], path.data) : fromLessons;

  let body;
  if (needsPath && path.isPending && !path.isError) {
    body = (
      <TactilePanel testID="pronunciation-loading">
        <ActivityIndicator color={tactile.primary} />
        <Text accessibilityLiveRegion="polite" className="mt-2 text-base" style={{ color: tactile.muted }}>
          {t.loading}
        </Text>
      </TactilePanel>
    );
  } else if (needsPath && path.isError) {
    body = <ErrorPanel testID="pronunciation-error" title={t.errorTitle} body={t.errorBody} retry={t.retry} onRetry={() => void path.refetch()} />;
  } else if (picked.sentences.length === 0) {
    body = (
      <TactilePanel testID="pronunciation-empty" tone="quiet">
        <Text className="font-display text-xl font-extrabold" style={{ color: tactile.ink }}>
          {t.noneTitle}
        </Text>
        <Text className="mt-2 text-base leading-6" style={{ color: tactile.body }}>
          {t.noneBody}
        </Text>
        <View className="mt-4 self-start">
          <TactileButton testID="pronunciation-empty-cta" label={t.noneCta} variant="primary" onPress={() => router.push("/daily")} />
        </View>
      </TactilePanel>
    );
  } else {
    body = (
      <View className="gap-4">
        <Text testID="pronunciation-origin" className="text-sm font-semibold" style={{ color: tactile.muted }}>
          {`${picked.origin === "lessons" ? t.fromLessons : t.fromUnit} ${t.freeNote}`}
        </Text>
        <ShadowStage sentences={picked.sentences} language={language} throughLang={through} />
      </View>
    );
  }

  return (
    <PracticePage testID="pronunciation-screen" kicker={t.kicker} title={t.title} dek={t.dek} back>
      {body}
    </PracticePage>
  );
}
