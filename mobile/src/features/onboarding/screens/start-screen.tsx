import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { FocusShell } from "@/features/shell/focus-shell";
import { PlacementScreen, type PlacementOutcome } from "@/features/placement/screens/placement-screen";
import { Stepper } from "@/ui/stepper";
import { InlineError } from "@/ui/inline-error";
import { Text } from "@/ui/text";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import {
  getJourney,
  journeyFinished,
  markJourneyDone,
  openJourney,
  patchJourney,
  useJourney,
  type JourneyState,
} from "@/lib/journey";
import { useSession } from "@/lib/session";
import type { AccountUser } from "@/api/schemas/auth";
import { MAX_THEMES, sanitizeThemes } from "@/lib/themes";
import { WelcomeStep } from "../components/welcome-step";
import { PairPicker } from "../components/pair-picker";
import { GoalPicker } from "../components/goal-picker";
import { InterestPicker } from "../components/interest-picker";
import { MinutesPicker } from "../components/minutes-picker";
import { LevelChoice } from "../components/level-choice";
import { ReadyStep } from "../components/ready-step";
import { StepAction, StepFrame } from "../components/step-frame";
import { useFocusScrollHeight } from "../components/use-focus-scroll-height";
import {
  canContinue,
  initialJourneyFlowState,
  journeyFlowReducer,
  normalizePair,
  stepProgress,
  toCefrLevel,
  type CefrLevel,
  type JourneyFlowState,
  type JourneyStep,
  type LevelSource,
  type SaveErrorKind,
} from "../model/journey-flow";
import { errorMessage, levelFromOutcome, saveErrorKind } from "../model/plan-input";
import { activatePair, savePlan } from "../save-plan";

/**
 * Estado inicial: retoma a jornada gravada deste aluno (sobrevive ao F5) ou
 * parte do que a conta já tem (par, temas, nível).
 */
function initialState(journey: JourneyState, user: AccountUser | null): JourneyFlowState {
  const own = Boolean(user) && journey.userId === user?.id;
  if (own) {
    return initialJourneyFlowState({
      step: journey.done ? "plan" : journey.step,
      target_lang: journey.target_lang,
      through_lang: journey.through_lang,
      goal: journey.goal || null,
      goal_note: journey.goal_note,
      interests: journey.interests.length > 0 ? journey.interests : (user?.interests ?? []),
      minutes: journey.minutes,
      level: journey.level ?? (journey.done ? user?.level : null) ?? null,
      level_source: journey.level_source,
    });
  }
  return initialJourneyFlowState({
    target_lang: user?.target_lang,
    through_lang: user?.native_lang,
    interests: user?.interests ?? [],
  });
}

/**
 * /start: a porta de entrada do aluno novo.
 * boas-vindas → par → objetivo → temas → tempo → nível → plano → /daily.
 */
export function StartScreen() {
  const router = useRouter();
  const t = useAreaCopy(ONBOARDING_COPY);
  const session = useSession();
  const journey = useJourney();
  const user = session?.user ?? null;
  const [state, dispatch] = useReducer(journeyFlowReducer, undefined, () => initialState(getJourney(), user));
  const [placeMode, setPlaceMode] = useState<"choice" | "test">("choice");
  const [pairPending, setPairPending] = useState(false);
  const [pairError, setPairError] = useState<SaveErrorKind | null>(null);
  const savingRef = useRef(false);
  const lastLevel = useRef<{ level: CefrLevel; source: LevelSource } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollHeight = useFocusScrollHeight();

  const userId = user?.id ?? null;

  /** Grava na jornada deste aluno (nunca na de outra conta do aparelho). */
  const remember = useCallback(
    (patch: Partial<JourneyState>) => {
      if (!userId) return;
      openJourney(userId);
      patchJourney(patch);
    },
    [userId],
  );

  // Cada troca de passo volta ao topo e fica gravada (F5 retoma daqui).
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (userId && !journeyFinished(userId)) {
      remember({ step: state.step });
    }
  }, [state.step, userId, remember]);

  const goTo = useCallback((step: JourneyStep) => dispatch({ type: "SET_STEP", step }), []);

  const handlePairNext = async () => {
    if (!user || pairPending || !canContinue(state, "pair")) return;
    setPairError(null);
    const sameAsAccount = user.target_lang === state.target_lang && user.native_lang === state.through_lang;
    if (!sameAsAccount) {
      setPairPending(true);
      try {
        // O nivelamento usa o curso ativo da conta: troca antes de medir.
        await activatePair(state.target_lang, state.through_lang);
      } catch (error) {
        setPairPending(false);
        setPairError(saveErrorKind(error));
        return;
      }
      setPairPending(false);
    }
    remember({ target_lang: state.target_lang, through_lang: state.through_lang });
    dispatch({ type: "NEXT_STEP" });
  };

  const handleGoalNext = () => {
    remember({ goal: state.goal ?? "", goal_note: state.goal_note });
    dispatch({ type: "NEXT_STEP" });
  };

  const handleThemesNext = () => {
    remember({ interests: state.interests });
    dispatch({ type: "NEXT_STEP" });
  };

  const handleTimeNext = () => {
    remember({ minutes: state.minutes });
    dispatch({ type: "NEXT_STEP" });
  };

  const save = async (level: CefrLevel, source: LevelSource) => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    lastLevel.current = { level, source };
    dispatch({ type: "SAVE_START", level, source });
    try {
      await savePlan({
        target_lang: state.target_lang,
        through_lang: state.through_lang,
        level,
        interests: state.interests,
        goal: state.goal,
        goal_note: state.goal_note,
      });
      remember({
        target_lang: state.target_lang,
        through_lang: state.through_lang,
        goal: state.goal ?? "",
        goal_note: state.goal_note,
        interests: state.interests,
        minutes: state.minutes,
        level,
        level_source: source,
      });
      markJourneyDone(user.id, level);
      dispatch({ type: "SAVE_OK" });
      setPlaceMode("choice");
    } catch (error) {
      dispatch({ type: "SAVE_FAIL", error: saveErrorKind(error) });
    } finally {
      savingRef.current = false;
    }
  };

  const handlePlacementFinished = (outcome: PlacementOutcome) => {
    const level = levelFromOutcome(outcome) ?? toCefrLevel(user?.level);
    if (level) {
      void save(level, "placement");
    }
  };

  const retrySave = () => {
    if (lastLevel.current) {
      void save(lastLevel.current.level, lastLevel.current.source);
    }
  };

  const handleBack = () => {
    if (state.pending || pairPending) return;
    if (state.step === "level" && placeMode === "test") {
      setPlaceMode("choice");
      return;
    }
    if (state.step === "plan") {
      setPlaceMode("choice");
    }
    dispatch({ type: "PREV_STEP" });
  };

  if (!session || !user) {
    // O guarda de rota manda para /account; nada a mostrar enquanto isso.
    return null;
  }

  const progress = stepProgress(state.step);
  // Jornada concluída: o plano mostra o que a conta guarda (fonte da verdade,
  // atualizada por refreshSession); objetivo e minutos são deste aparelho.
  const account = journey.done ? user : null;
  const planPair = account
    ? normalizePair(account.target_lang, account.native_lang)
    : { target_lang: state.target_lang, through_lang: state.through_lang };
  const planInterests = account?.interests && account.interests.length > 0 ? sanitizeThemes(account.interests) : state.interests;
  const planLevel = (account ? toCefrLevel(account.level) : null) ?? state.level ?? toCefrLevel(user.level);

  return (
    <FocusShell
      headerCenter={
        progress ? (
          <View style={styles.stepper}>
            <Stepper
              currentStep={progress.current}
              totalSteps={progress.total}
              label={t.stepOf(progress.current, progress.total)}
              testID="onboarding-stepper"
            />
          </View>
        ) : null
      }
      onBack={state.step !== "welcome" ? handleBack : undefined}
      onClose={journey.done ? () => router.replace("/" as Href) : undefined}
      confirmExit={false}
      testID="onboarding-start-screen"
    >
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: scrollHeight }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {state.step === "welcome" ? <WelcomeStep onBegin={() => dispatch({ type: "NEXT_STEP" })} /> : null}

        {state.step === "pair" ? (
          <StepFrame
            title={t.pairTitle}
            dek={t.pairDek}
            testID="onboarding-step-pair"
            footer={
              <>
                {pairError ? (
                  <InlineError
                    message={errorMessage(t, pairError)}
                    onRetry={() => void handlePairNext()}
                    retryLabel={t.retry}
                    testID="onboarding-pair-error"
                  />
                ) : null}
                <StepAction
                  label={pairPending ? t.pairSaving : t.continue}
                  onPress={() => void handlePairNext()}
                  disabled={pairPending || !canContinue(state, "pair")}
                  testID="onboarding-pair-next"
                />
              </>
            }
          >
            <PairPicker
              targetLang={state.target_lang}
              throughLang={state.through_lang}
              onChangeTarget={(lang) => dispatch({ type: "SET_TARGET_LANG", lang })}
              onChangeThrough={(lang) => dispatch({ type: "SET_THROUGH_LANG", lang })}
              disabled={pairPending}
            />
          </StepFrame>
        ) : null}

        {state.step === "goal" ? (
          <StepFrame
            title={t.goalTitle}
            dek={t.goalDek}
            testID="onboarding-step-goal"
            footer={
              <StepAction
                label={t.continue}
                onPress={handleGoalNext}
                disabled={!canContinue(state, "goal")}
                testID="onboarding-goal-next"
              />
            }
          >
            <GoalPicker
              goal={state.goal}
              note={state.goal_note}
              onChangeGoal={(goal) => dispatch({ type: "SET_GOAL", goal })}
              onChangeNote={(note) => dispatch({ type: "SET_GOAL_NOTE", note })}
            />
          </StepFrame>
        ) : null}

        {state.step === "themes" ? (
          <StepFrame
            title={t.themesTitle}
            dek={t.themesDek(MAX_THEMES)}
            testID="onboarding-step-themes"
            footer={
              <StepAction
                label={t.continue}
                onPress={handleThemesNext}
                disabled={!canContinue(state, "themes")}
                testID="onboarding-themes-next"
              />
            }
          >
            <InterestPicker
              interests={state.interests}
              onToggleInterest={(interest) => dispatch({ type: "TOGGLE_INTEREST", interest })}
              onAddInterest={(interest) => dispatch({ type: "ADD_INTEREST", interest })}
              onRemoveInterest={(interest) => dispatch({ type: "REMOVE_INTEREST", interest })}
            />
          </StepFrame>
        ) : null}

        {state.step === "time" ? (
          <StepFrame
            title={t.timeTitle}
            dek={t.timeDek}
            testID="onboarding-step-time"
            footer={<StepAction label={t.continue} onPress={handleTimeNext} testID="onboarding-time-next" />}
          >
            <MinutesPicker minutes={state.minutes} onChange={(minutes) => dispatch({ type: "SET_MINUTES", minutes })} />
          </StepFrame>
        ) : null}

        {state.step === "level" ? (
          <View style={styles.levelStep} testID="onboarding-step-level">
            {state.error ? (
              <InlineError
                message={errorMessage(t, state.error)}
                onRetry={lastLevel.current ? retrySave : undefined}
                retryLabel={t.retry}
                testID="onboarding-save-error"
              />
            ) : null}
            {state.pending ? (
              <Text variant="body" weight="semibold" tone="accent" accessibilityRole="alert" testID="onboarding-saving">
                {t.savingPlan}
              </Text>
            ) : null}
            {placeMode === "test" ? (
              <PlacementScreen embedded onFinished={handlePlacementFinished} />
            ) : (
              <StepFrame title={t.levelTitle} dek={t.levelDek}>
                <LevelChoice
                  onStartTest={() => setPlaceMode("test")}
                  onSelectLevel={(level) => void save(level, "self")}
                  initialLevel={state.level}
                  pending={state.pending}
                />
              </StepFrame>
            )}
          </View>
        ) : null}

        {state.step === "plan" && planLevel ? (
          <ReadyStep
            level={planLevel}
            levelSource={state.level_source}
            targetLang={planPair.target_lang}
            throughLang={planPair.through_lang}
            goal={state.goal}
            goalNote={state.goal_note}
            interests={planInterests}
            minutes={state.minutes}
            onStart={() => router.replace("/daily" as Href)}
            onEdit={() => goTo("pair")}
          />
        ) : null}
      </ScrollView>
    </FocusShell>
  );
}

const styles = StyleSheet.create({
  stepper: {
    width: "100%",
    maxWidth: 220,
    alignSelf: "center",
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  levelStep: {
    gap: 16,
    width: "100%",
  },
});
