import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { FocusShell } from "@/features/shell/focus-shell";
import { InlineError } from "@/ui/inline-error";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";
import { currentAccount } from "@/api/auth";
import type { AccountUser } from "@/api/schemas/auth";
import { listStudyTracks } from "@/api/study";
import type { StudyTrackChoice } from "@/api/schemas/study";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { getJourney, openJourney, patchJourney } from "@/lib/journey";
import { rememberProfile, useSession } from "@/lib/session";
import { MAX_THEMES } from "@/lib/themes";
import { PairPicker } from "../components/pair-picker";
import { GoalPicker } from "../components/goal-picker";
import { InterestPicker } from "../components/interest-picker";
import { MinutesPicker } from "../components/minutes-picker";
import { StepAction } from "../components/step-frame";
import { useFocusScrollHeight } from "../components/use-focus-scroll-height";
import {
  canContinue,
  initialJourneyFlowState,
  journeyFlowReducer,
  toCefrLevel,
  type CefrLevel,
  type JourneyFlowState,
  type SaveErrorKind,
} from "../model/journey-flow";
import { errorMessage, saveErrorKind, trackLevel } from "../model/plan-input";
import { savePlan } from "../save-plan";

/** Curso novo começa em A1 até o nivelamento dizer outra coisa. */
const NEW_COURSE_LEVEL: CefrLevel = "A1";

function sameChoices(a: JourneyFlowState, b: JourneyFlowState): boolean {
  return (
    a.target_lang === b.target_lang &&
    a.through_lang === b.through_lang &&
    a.goal === b.goal &&
    a.goal_note === b.goal_note &&
    a.minutes === b.minutes &&
    a.interests.length === b.interests.length &&
    a.interests.every((item, index) => item === b.interests[index])
  );
}

type Loaded = { account: AccountUser; tracks: StudyTrackChoice[] };

/**
 * /quiz: editor de par, objetivo, temas e tempo diário, aberto a partir de "Você".
 * Edita o que está na CONTA: carrega /auth/me e /study/tracks antes de abrir
 * (o cache da sessão pode estar velho) e salva pela mesma rota do primeiro dia,
 * voltando para /profile.
 */
export function QuizScreen() {
  const router = useRouter();
  const t = useAreaCopy(ONBOARDING_COPY);
  const session = useSession();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<SaveErrorKind | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoadError(null);
    Promise.all([currentAccount(), listStudyTracks()])
      .then(([account, tracks]) => {
        if (!alive) return;
        rememberProfile(account);
        setLoaded({ account, tracks });
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(saveErrorKind(error));
      });
    return () => {
      alive = false;
    };
  }, [userId, attempt]);

  if (!session) {
    return null;
  }

  if (loaded && loaded.account.id === session.user.id) {
    return <QuizEditor account={loaded.account} tracks={loaded.tracks} />;
  }

  return (
    <FocusShell onClose={() => router.replace("/profile" as Href)} confirmExit={false} testID="quiz-screen-loading">
      <View style={styles.loading}>
        {loadError ? (
          <InlineError
            message={errorMessage(t, loadError)}
            onRetry={() => setAttempt((value) => value + 1)}
            retryLabel={t.retry}
            testID="quiz-load-error"
          />
        ) : (
          <Text variant="body" tone="muted" accessibilityRole="progressbar" testID="quiz-loading">
            {t.quizLoading}
          </Text>
        )}
      </View>
    </FocusShell>
  );
}

function QuizEditor({ account, tracks }: Loaded) {
  const router = useRouter();
  const t = useAreaCopy(ONBOARDING_COPY);
  const { palette } = useTheme();

  const initial = useMemo(() => {
    const journey = getJourney();
    const own = journey.userId === account.id;
    return initialJourneyFlowState({
      target_lang: account.target_lang,
      through_lang: account.native_lang,
      interests: account.interests && account.interests.length > 0 ? account.interests : own ? journey.interests : [],
      goal: own ? journey.goal || null : null,
      goal_note: own ? journey.goal_note : "",
      minutes: own ? journey.minutes : undefined,
    });
  }, [account]);

  const [state, dispatch] = useReducer(journeyFlowReducer, initial);
  const savingRef = useRef(false);
  const [footerHeight, setFooterHeight] = useState(0);
  // O rodapé do FocusShell soma 12 + 12 de respiro e 1 de borda ao conteúdo medido.
  const scrollHeight = useFocusScrollHeight(footerHeight > 0 ? footerHeight + 25 : 0);

  const dirty = !sameChoices(state, initial);
  const knownLevel = trackLevel(tracks, state.target_lang);
  const sameCourse = state.target_lang === account.target_lang;
  const level: CefrLevel = (sameCourse ? toCefrLevel(account.level) : null) ?? knownLevel ?? NEW_COURSE_LEVEL;
  const newCourse = !sameCourse && knownLevel === null;
  const valid = canContinue(state, "pair") && canContinue(state, "themes");

  const leave = () => router.replace("/profile" as Href);

  const handleSave = async () => {
    if (savingRef.current || !valid) return;
    savingRef.current = true;
    dispatch({ type: "SAVE_START", level });
    try {
      await savePlan({
        target_lang: state.target_lang,
        through_lang: state.through_lang,
        level,
        interests: state.interests,
        goal: state.goal,
        goal_note: state.goal_note,
      });
      openJourney(account.id);
      patchJourney({
        target_lang: state.target_lang,
        through_lang: state.through_lang,
        goal: state.goal ?? "",
        goal_note: state.goal_note,
        interests: state.interests,
        minutes: state.minutes,
      });
      dispatch({ type: "SAVE_OK" });
      leave();
    } catch (error) {
      dispatch({ type: "SAVE_FAIL", error: saveErrorKind(error) });
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <FocusShell
      onClose={leave}
      confirmExit={dirty && !state.pending}
      exitTitle={t.quizExitTitle}
      exitMessage={t.quizExitMessage}
      testID="quiz-screen"
      footer={
        <View style={styles.footer} onLayout={(event) => setFooterHeight(Math.ceil(event.nativeEvent.layout.height))}>
          {state.error ? (
            <InlineError
              message={errorMessage(t, state.error)}
              onRetry={() => void handleSave()}
              retryLabel={t.retry}
              testID="quiz-save-error"
            />
          ) : null}
          <View style={styles.footerActions}>
            <View style={styles.footerCancel}>
              <StepAction label={t.quizCancel} variant="ghost" onPress={leave} disabled={state.pending} testID="quiz-cancel" />
            </View>
            <View style={styles.footerSave}>
              <StepAction
                label={state.pending ? t.saving : t.quizSave}
                onPress={() => void handleSave()}
                disabled={state.pending || !valid}
                testID="quiz-save"
              />
            </View>
          </View>
        </View>
      }
    >
      <ScrollView style={{ maxHeight: scrollHeight }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="title" weight="bold" tone="ink" accessibilityRole="header" style={styles.title}>
            {t.quizTitle}
          </Text>
          <Text variant="body" tone="muted">
            {t.quizDek}
          </Text>
        </View>

        <Section title={t.quizCourse} testID="quiz-section-course">
          <PairPicker
            targetLang={state.target_lang}
            throughLang={state.through_lang}
            onChangeTarget={(lang) => dispatch({ type: "SET_TARGET_LANG", lang })}
            onChangeThrough={(lang) => dispatch({ type: "SET_THROUGH_LANG", lang })}
            disabled={state.pending}
          />
          <View style={[styles.levelRow, { borderColor: palette.line, backgroundColor: palette.sunken }]}>
            <Text variant="body" weight="semibold" tone="ink" testID="quiz-level">
              {t.quizLevel(level)}
            </Text>
            {newCourse ? (
              <Text variant="body-sm" tone="muted" testID="quiz-new-course">
                {t.quizNewCourse}
              </Text>
            ) : null}
            {!dirty ? (
              <StepAction
                label={t.quizRetake}
                variant="secondary"
                onPress={() => router.push("/placement" as Href)}
                testID="quiz-retake-placement"
              />
            ) : null}
          </View>
        </Section>

        <Section title={t.goalTitle} testID="quiz-section-goal">
          <GoalPicker
            goal={state.goal}
            note={state.goal_note}
            onChangeGoal={(goal) => dispatch({ type: "SET_GOAL", goal })}
            onChangeNote={(note) => dispatch({ type: "SET_GOAL_NOTE", note })}
          />
        </Section>

        <Section title={t.themesTitle} dek={t.themesDek(MAX_THEMES)} testID="quiz-section-themes">
          <InterestPicker
            interests={state.interests}
            onToggleInterest={(interest) => dispatch({ type: "TOGGLE_INTEREST", interest })}
            onAddInterest={(interest) => dispatch({ type: "ADD_INTEREST", interest })}
            onRemoveInterest={(interest) => dispatch({ type: "REMOVE_INTEREST", interest })}
          />
        </Section>

        <Section title={t.timeTitle} dek={t.timeDek} testID="quiz-section-time">
          <MinutesPicker minutes={state.minutes} onChange={(minutes) => dispatch({ type: "SET_MINUTES", minutes })} />
        </Section>
      </ScrollView>
    </FocusShell>
  );
}

function Section({ title, dek, children, testID }: { title: string; dek?: string; children: ReactNode; testID: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: palette.line }]} testID={testID}>
      <View style={styles.sectionHead}>
        <Text variant="heading-sm" weight="bold" tone="ink" accessibilityRole="header">
          {title}
        </Text>
        {dek ? (
          <Text variant="body-sm" tone="muted">
            {dek}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 32,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
    gap: 8,
  },
  header: {
    gap: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  section: {
    gap: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  sectionHead: {
    gap: 4,
  },
  loading: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingVertical: 24,
  },
  levelRow: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  footer: {
    gap: 10,
  },
  footerActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  footerCancel: {
    flex: 1,
  },
  footerSave: {
    flex: 2,
  },
});
