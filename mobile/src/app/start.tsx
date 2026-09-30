import { Redirect, router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { PlacementScreen } from "@/components/placement/placement-screen";
import { AppFrame } from "@/components/shell/app-frame";
import { Flag } from "@/components/shell/flag";
import { submitOnboarding } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { getJourney, markJourneyDone, openJourney, patchJourney, useJourney, type JourneyStep } from "@/lib/journey";
import { STUDY_LANGUAGES, THROUGH_LANGUAGES, languageName } from "@/lib/languages";
import { bindProgressLang, setPro } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";
import { NEWS_THEMES } from "@/lib/themes";
import { useTheme } from "@/theme/ThemeContext";

const STEPS = ["welcome", "pair", "interests", "place", "ready"] as const;

function backStep(step: JourneyStep): JourneyStep | null {
  if (step === "pair") {
    return "welcome";
  }
  if (step === "interests") {
    return "pair";
  }
  if (step === "place") {
    return "interests";
  }
  return null;
}

export default function StartJourney() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
  const journey = useJourney();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    const current = openJourney(session.user.id);
    if (current.step === "welcome" && current.interests.length === 0 && !current.goal) {
      patchJourney({
        target_lang: session.user.target_lang,
        through_lang: session.user.native_lang,
      });
    }
  }, [session]);

  if (!session) {
    return <Redirect href="/account" />;
  }

  const token = session.token;
  const account = session.user;
  const step = journey.userId === account.id ? journey.step : "welcome";
  const index = Math.max(0, STEPS.indexOf(step));
  const previous = backStep(step);

  async function savePair() {
    setError(null);
    patchJourney({ step: "interests" });
    void tap("medium");
  }

  async function saveInterests() {
    if (journey.interests.length === 0) {
      setError(copy.startNeedInterest);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await submitOnboarding(token, {
        interests: journey.interests,
        tracks: [{ target_lang: journey.target_lang, through_lang: journey.through_lang, active: true }],
        ...(journey.goal.trim() ? { goal: journey.goal.trim() } : {}),
      });
      rememberProfile({
        target_lang: result.target_lang,
        native_lang: result.native_lang,
        interests: journey.interests,
        level: result.level as typeof account.level,
      });
      bindProgressLang(result.target_lang);
      if (account.plan === "pro") {
        setPro(true);
      }
      patchJourney({ step: "place" });
      void tap("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.createTopicsFailed);
    } finally {
      setPending(false);
    }
  }

  function finish(level: string) {
    patchJourney({ step: "ready", level, done: false });
    rememberProfile({ level: level as typeof account.level });
    void tap("success");
  }

  function goBack() {
    if (!previous) {
      return;
    }
    setError(null);
    patchJourney({ step: previous });
    void tap("light");
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <View className="gap-4">
          <Text className="font-label text-xs uppercase tracking-[0.28em] text-ember">
            {copy.startKicker} · {String(index + 1).padStart(2, "0")} / 05
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: 5, now: index + 1 }}
            className="flex-row gap-2"
          >
            {STEPS.map((item, itemIndex) => (
              <View
                key={item}
                className={`h-1.5 flex-1 rounded-full ${itemIndex < index ? "bg-ink" : itemIndex === index ? "bg-ember" : "bg-line"}`}
              />
            ))}
          </View>
          {previous ? (
            <Pressable
              accessibilityRole="button"
              onPress={goBack}
              className="min-h-12 items-center justify-center self-start rounded-full px-1"
            >
              <Text className="font-label text-base text-muted">{copy.startBack}</Text>
            </Pressable>
          ) : null}
        </View>
        {step === "welcome" ? (
          <View className="gap-6">
            <Text className="font-displayItalic text-display text-ink">{copy.startWelcomeTitle}</Text>
            <Text className="max-w-2xl text-lg leading-8 text-ink">{copy.startWelcomeBody}</Text>
            <Text className="max-w-2xl text-base leading-7 text-muted">{copy.startWelcomeCast}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                patchJourney({ step: "pair" });
                void tap("medium");
              }}
              className="mt-2 min-h-14 items-center justify-center self-start rounded-full bg-ember px-8"
            >
              <Text className="font-label text-base text-onEmber">{copy.startBegin}</Text>
            </Pressable>
          </View>
        ) : null}
        {step === "pair" ? (
          <View className="gap-6">
            <Text className="font-displayItalic text-display text-ink">{copy.startPairTitle}</Text>
            <Text className="max-w-2xl text-base leading-7 text-muted">{copy.startPairDek}</Text>
            <Text className="font-label text-sm text-muted">{copy.study}</Text>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {STUDY_LANGUAGES.map((item) => {
                const active = item.id === journey.target_lang;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, checked: active }}
                    onPress={() => {
                      const through = item.id === journey.through_lang ? (item.id === "en" ? "pt" : "en") : journey.through_lang;
                      patchJourney({ target_lang: item.id, through_lang: through });
                      void tap("light");
                    }}
                    className={`min-h-14 flex-row items-center gap-2 rounded-full px-5 ${active ? "bg-ember" : "border border-line bg-paper"}`}
                  >
                    <Flag code={item.id} size={22} />
                    <Text className={`font-label text-base ${active ? "text-onEmber" : "text-ink"}`}>{languageName(item.id)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-label text-sm text-muted">{copy.through}</Text>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {THROUGH_LANGUAGES.filter((item) => item.id !== journey.target_lang).map((item) => {
                const active = item.id === journey.through_lang;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, checked: active }}
                    onPress={() => {
                      patchJourney({ through_lang: item.id });
                      void tap("light");
                    }}
                    className={`min-h-14 flex-row items-center gap-2 rounded-full px-5 ${active ? "bg-ink" : "border border-line bg-paper"}`}
                  >
                    <Flag code={item.id} size={22} />
                    <Text className={`font-label text-base ${active ? "text-card" : "text-ink"}`}>{languageName(item.id)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void savePair()}
              className="min-h-14 items-center justify-center self-start rounded-full bg-ember px-8"
            >
              <Text className="font-label text-base text-onEmber">{copy.startNext}</Text>
            </Pressable>
          </View>
        ) : null}
        {step === "interests" ? (
          <View className="gap-6">
            <Text className="font-displayItalic text-display text-ink">{copy.startInterestTitle}</Text>
            <Text className="max-w-2xl text-base leading-7 text-muted">{copy.startInterestDek}</Text>
            <View className="flex-row flex-wrap gap-2">
              {NEWS_THEMES.map((theme) => {
                const active = journey.interests.includes(theme);
                return (
                  <Pressable
                    key={theme}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    onPress={() => {
                      const next = active
                        ? journey.interests.filter((item) => item !== theme)
                        : [...journey.interests, theme].slice(0, 12);
                      patchJourney({ interests: next });
                      void tap("light");
                    }}
                    className={`min-h-12 items-center justify-center rounded-full px-5 ${active ? "bg-ember" : "border border-line bg-paper"}`}
                  >
                    <Text className={`font-label text-base ${active ? "text-onEmber" : "text-ink"}`}>{theme}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-label text-sm text-muted">{copy.startGoalLabel}</Text>
            <TextInput
              value={journey.goal}
              onChangeText={(goal) => patchJourney({ goal })}
              placeholder={copy.startGoalHint}
              placeholderTextColor={palette.onSurfaceVariant}
              accessibilityLabel={copy.startGoalLabel}
              className="min-h-14 rounded-[24px] border border-line bg-card px-5 text-base text-ink"
            />
            {error ? (
              <Text accessibilityRole="alert" className="text-base text-roseInk">
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: pending, disabled: pending }}
              disabled={pending}
              onPress={() => void saveInterests()}
              className={`min-h-14 items-center justify-center self-start rounded-full px-8 ${pending ? "bg-line" : "bg-ember"}`}
            >
              <Text className={`font-label text-base ${pending ? "text-muted" : "text-onEmber"}`}>
                {pending ? copy.startSaving : copy.startToPlacement}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {step === "place" ? (
          <View className="gap-5">
            <Text className="font-displayItalic text-headline text-ink">{copy.startPlaceTitle}</Text>
            <Text className="max-w-2xl text-base leading-7 text-muted">{copy.startPlaceDek}</Text>
            <PlacementScreen embedded autoStart onDone={finish} />
          </View>
        ) : null}
        {step === "ready" ? (
          <View className="gap-6">
            <Text className="font-displayItalic text-display text-ink">{copy.startReadyTitle}</Text>
            <Text className="max-w-2xl text-lg leading-8 text-ink">
              {copy.startReadyBody.replace("{level}", journey.level ?? getJourney().level ?? account.level)}
            </Text>
            <Text className="max-w-2xl text-base leading-7 text-muted">{copy.startReadyBeats}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                markJourneyDone(account.id, journey.level ?? account.level);
                void tap("medium");
                router.replace("/daily" as Href);
              }}
              className="min-h-14 items-center justify-center self-start rounded-full bg-ember px-8"
            >
              <Text className="font-label text-base text-onEmber">{copy.startOpenLesson}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </AppFrame>
  );
}
