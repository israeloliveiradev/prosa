import { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { FocusShell } from "@/features/shell/focus-shell";
import { Stepper } from "@/ui/stepper";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Pill } from "@/ui/pill";
import { PairPicker } from "../components/pair-picker";
import { InterestPicker } from "../components/interest-picker";
import { submitOnboarding } from "@/api/onboarding";
import { CEFR_LEVELS, type CourseLevel } from "@/lib/languages";
import { rememberProfile, useSession } from "@/lib/session";
import { bindProgressLang } from "@/lib/progress";
import { useCopy } from "@/lib/i18n";

const TOTAL_STEPS = 3;

export function QuizScreen() {
  const router = useRouter();
  const copy = useCopy();
  const session = useSession();

  const [currentStep, setCurrentStep] = useState(0); // 0: Pair, 1: Level, 2: Interests
  const [targetLang, setTargetLang] = useState(session?.user?.target_lang || "en");
  const [throughLang, setThroughLang] = useState(session?.user?.native_lang || "pt");
  const [level, setLevel] = useState<CourseLevel>(
    (session?.user?.level as CourseLevel) || "A2",
  );
  const [interests, setInterests] = useState<string[]>(
    session?.user?.interests || [],
  );
  const [goal, setGoal] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);

  const handleToggleInterest = (theme: string) => {
    setError(null);
    setInterests((prev) =>
      prev.includes(theme)
        ? prev.filter((item) => item !== theme)
        : [...prev, theme].slice(0, 10),
    );
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (interests.length === 0) {
      setError("Selecione pelo menos 1 interesse para personalizar suas prosas.");
      return;
    }

    if (!session?.token) {
      router.push("/account");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await submitOnboarding(session.token, {
        tracks: [
          {
            target_lang: targetLang,
            through_lang: throughLang,
            level,
            active: true,
          },
        ],
        interests,
        level,
        ...(goal.trim() ? { goal: goal.trim() } : {}),
      });

      rememberProfile({
        target_lang: result.target_lang,
        native_lang: result.native_lang,
        interests,
        level: (result.level as CourseLevel) || level,
      });

      bindProgressLang(result.target_lang);

      if (result.topics && result.topics.length > 0) {
        setTopics(result.topics);
      } else {
        router.replace("/daily");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (copy.createTopicsFailed ?? "Erro ao salvar preferências"));
    } finally {
      setPending(false);
    }
  };

  const handleOpenTopic = (topic: string) => {
    router.replace({ pathname: "/daily", params: { topic, personalized: "1" } });
  };

  // Se tópicos foram gerados, renderiza tela de sucesso com tópicos recomendados
  if (topics.length > 0) {
    return (
      <FocusShell
        onClose={() => router.replace("/daily")}
        confirmExit={false}
        testID="quiz-topics-screen"
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={{ gap: 20 }}>
            <View style={{ gap: 8 }}>
              <Text variant="title" tone="ink">
                {copy.quizReadyTitle ?? "Suas trilhas personalizadas estão prontas"}
              </Text>
              <Text variant="body" tone="muted">
                {copy.quizReadyDek ?? "Selecionamos estes tópicos iniciais alinhados aos seus temas e nível."}
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {topics.map((t, idx) => (
                <Card
                  key={idx}
                  padding="md"
                  onPress={() => handleOpenTopic(t)}
                  testID={`quiz-topic-item-${idx}`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text variant="body" weight="semibold" tone="ink">
                      {t}
                    </Text>
                    <Pill label={level} tone="accent" />
                  </View>
                </Card>
              ))}
            </View>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              label={copy.navHome ?? "Começar a estudar"}
              onPress={() => router.replace("/daily")}
              testID="quiz-finish-button"
            />
          </View>
        </ScrollView>
      </FocusShell>
    );
  }

  return (
    <FocusShell
      headerCenter={
        <View style={{ width: 140 }}>
          <Stepper currentStep={currentStep + 1} totalSteps={TOTAL_STEPS} />
        </View>
      }
      onClose={handlePrevStep}
      confirmExit={currentStep > 0}
      exitTitle={copy.confirmExitTitle ?? "Deseja sair?"}
      exitMessage={copy.confirmExitMessage ?? "As alterações não salvas serão descartadas."}
      testID="quiz-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 0 && (
          <PairPicker
            targetLang={targetLang}
            throughLang={throughLang}
            onChangeTarget={setTargetLang}
            onChangeThrough={setThroughLang}
            onNext={handleNextStep}
          />
        )}

        {currentStep === 1 && (
          <View style={styles.stepContainer} testID="quiz-level-step">
            <View style={{ gap: 8 }}>
              <Text variant="title" tone="ink">
                {copy.quizLevelTitle ?? "Qual é seu nível estimado?"}
              </Text>
              <Text variant="body" tone="muted">
                {copy.quizLevelDek ?? "Você pode ajustar a qualquer momento ou confirmar com um teste de nivelamento."}
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {CEFR_LEVELS.map((lvl) => {
                const isSelected = level === lvl;
                return (
                  <Card
                    key={lvl}
                    padding="md"
                    selected={isSelected}
                    onPress={() => setLevel(lvl)}
                    testID={`quiz-level-${lvl}`}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text variant="body" weight="semibold" tone="ink">
                        Nível {lvl}
                      </Text>
                      <Pill label={lvl} tone={isSelected ? "accent" : "neutral"} />
                    </View>
                  </Card>
                );
              })}
            </View>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              label={copy.nextStep ?? "Continuar"}
              onPress={handleNextStep}
              testID="quiz-level-next"
            />
          </View>
        )}

        {currentStep === 2 && (
          <InterestPicker
            interests={interests}
            goal={goal}
            onToggleInterest={handleToggleInterest}
            onChangeGoal={setGoal}
            onSubmit={handleSubmit}
            pending={pending}
            error={error}
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
  stepContainer: {
    gap: 24,
    width: "100%",
  },
});
