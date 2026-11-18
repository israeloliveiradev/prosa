import { useEffect, useRef, useState, useReducer } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { FocusShell } from "@/features/shell/focus-shell";
import { Stepper } from "@/ui/stepper";
import { WelcomeStep } from "../components/welcome-step";
import { PairPicker } from "../components/pair-picker";
import { InterestPicker } from "../components/interest-picker";
import { LevelChoice } from "../components/level-choice";
import { ReadyStep } from "../components/ready-step";
import { PlacementScreen } from "@/features/placement/screens/placement-screen";
import {
  journeyFlowReducer,
  initialJourneyFlowState,
  stepIndex,
} from "../model/journey-flow";
import {
  useJourney,
  patchJourney,
  markJourneyDone,
  resetJourney,
} from "@/lib/journey";
import { useSession, rememberProfile } from "@/lib/session";
import { submitOnboarding } from "@/api/onboarding";
import { useCopy } from "@/lib/i18n";
import { useProsa } from "@/context/prosa-context";

export function StartScreen() {
  const router = useRouter();
  const copy = useCopy();
  const session = useSession();
  const journey = useJourney();
  const { setTargetLang, setThroughLang } = useProsa();
  const savingRef = useRef(false);
  const [placeMode, setPlaceMode] = useState<"choice" | "test">("choice");

  const isUnauthenticated = !session;
  const shouldResetToStart = isUnauthenticated && (journey.done || journey.step === "ready");
  const initialStep = shouldResetToStart ? "welcome" : journey.step;
  const initialLevel = shouldResetToStart ? null : (journey.level || session?.user?.level || null);

  const [state, dispatch] = useReducer(
    journeyFlowReducer,
    initialJourneyFlowState({
      step: initialStep,
      target_lang: journey.target_lang || session?.user?.target_lang || "en",
      through_lang: journey.through_lang || session?.user?.native_lang || "pt",
      interests: journey.interests?.length ? journey.interests : (session?.user?.interests || []),
      goal: journey.goal || "",
      level: initialLevel,
    }),
  );

  useEffect(() => {
    if (shouldResetToStart) {
      resetJourney();
    }
  }, [shouldResetToStart]);

  const handleNextFromWelcome = () => {
    patchJourney({ step: "pair" });
    dispatch({ type: "NEXT_STEP" });
  };

  const handleNextFromPair = () => {
    setTargetLang(state.target_lang);
    setThroughLang(state.through_lang);
    patchJourney({
      target_lang: state.target_lang,
      through_lang: state.through_lang,
      step: "interests",
    });
    dispatch({ type: "NEXT_STEP" });
  };

  const handleSaveInterests = async () => {
    if (savingRef.current || state.pending) return;
    savingRef.current = true;
    dispatch({ type: "SET_PENDING", pending: true });
    dispatch({ type: "SET_ERROR", error: null });

    const token = session?.token;
    if (token) {
      try {
        await submitOnboarding(token, {
          tracks: [
            {
              target_lang: state.target_lang,
              through_lang: state.through_lang,
              level: (state.level as any) || "A2",
              active: true,
            },
          ],
          interests: state.interests,
          goal: state.goal.trim() ? state.goal.trim() : undefined,
          level: (state.level as any) || "A2",
        });
        rememberProfile({
          target_lang: state.target_lang as any,
          native_lang: state.through_lang as any,
          interests: state.interests,
        });
      } catch (err) {
        savingRef.current = false;
        dispatch({
          type: "SET_ERROR",
          error: err instanceof Error ? err.message : "Erro ao salvar preferências.",
        });
        dispatch({ type: "SET_PENDING", pending: false });
        return;
      }
    }

    patchJourney({
      interests: state.interests,
      goal: state.goal,
      step: "place",
    });
    savingRef.current = false;
    dispatch({ type: "SET_PENDING", pending: false });
    dispatch({ type: "SET_STEP", step: "place" });
  };

  const handleDirectLevelSelect = async (chosenLevel: string) => {
    if (savingRef.current || state.pending) return;
    savingRef.current = true;
    dispatch({ type: "SET_PENDING", pending: true });

    rememberProfile({ level: chosenLevel as any });
    const token = session?.token;
    if (token) {
      try {
        await submitOnboarding(token, {
          tracks: [
            {
              target_lang: state.target_lang,
              through_lang: state.through_lang,
              level: (chosenLevel as any) || "A2",
              active: true,
            },
          ],
          interests: state.interests,
          goal: state.goal.trim() ? state.goal.trim() : undefined,
          level: (chosenLevel as any) || "A2",
        });
      } catch {
        // Fallback local se rede oscilar
      }
    }

    patchJourney({ level: chosenLevel, step: "ready" });
    savingRef.current = false;
    dispatch({ type: "SET_PENDING", pending: false });
    dispatch({ type: "FINISH_PLACEMENT", level: chosenLevel });
  };

  const handleFinishPlacement = (level: string) => {
    patchJourney({ level, step: "ready" });
    dispatch({ type: "FINISH_PLACEMENT", level });
  };

  const handleFinishJourney = () => {
    setTargetLang(state.target_lang);
    setThroughLang(state.through_lang);
    const userId = session?.user?.id || "guest";
    const finalLevel = state.level || "A2";
    markJourneyDone(userId, finalLevel);
    router.replace("/daily");
  };

  const currentStepNum = stepIndex(state.step) + 1;

  const handleBack = () => {
    if (state.step === "ready") {
      dispatch({ type: "PREV_STEP" });
      patchJourney({ step: "place" });
    } else if (state.step === "place" && placeMode === "test") {
      setPlaceMode("choice");
    } else if (state.step === "welcome") {
      router.replace("/");
    } else {
      dispatch({ type: "PREV_STEP" });
    }
  };

  const handleRestart = () => {
    resetJourney();
    dispatch({ type: "RESET" });
  };

  return (
    <FocusShell
      headerCenter={
        <View style={{ width: 140 }}>
          <Stepper currentStep={currentStepNum} totalSteps={5} />
        </View>
      }
      onBack={state.step !== "welcome" ? handleBack : undefined}
      onClose={() => router.replace("/")}
      confirmExit={false}
      testID="onboarding-start-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {state.step === "welcome" && (
          <WelcomeStep onBegin={handleNextFromWelcome} />
        )}

        {state.step === "pair" && (
          <PairPicker
            targetLang={state.target_lang}
            throughLang={state.through_lang}
            onChangeTarget={(lang) => dispatch({ type: "SET_TARGET_LANG", lang })}
            onChangeThrough={(lang) => dispatch({ type: "SET_THROUGH_LANG", lang })}
            onNext={handleNextFromPair}
          />
        )}

        {state.step === "interests" && (
          <InterestPicker
            interests={state.interests}
            goal={state.goal}
            onToggleInterest={(interest) => dispatch({ type: "TOGGLE_INTEREST", interest })}
            onChangeGoal={(goal) => dispatch({ type: "SET_GOAL", goal })}
            onSubmit={handleSaveInterests}
            pending={state.pending}
            error={state.error}
          />
        )}

        {state.step === "place" && (
          placeMode === "choice" ? (
            <LevelChoice
              onStartTest={() => setPlaceMode("test")}
              onSelectLevel={handleDirectLevelSelect}
              pending={state.pending}
            />
          ) : (
            <PlacementScreen
              embedded
              autoStart
              onDone={handleFinishPlacement}
            />
          )
        )}

        {state.step === "ready" && (
          <ReadyStep
            level={state.level || "A2"}
            onOpenProse={handleFinishJourney}
            onRestart={handleRestart}
          />
        )}
      </ScrollView>
    </FocusShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
});
