import { useState } from "react";
import { Text, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { BodyText, TactilePage } from "@/features/shell/tactile-page";
import { CastPortrait } from "@/features/cast/cast-portrait";
import { resetGuide } from "@/lib/guide";
import { phaseName, useLocale } from "@/lib/i18n";
import { useAreaCopy } from "@/lib/copy/area";
import { GUIDE } from "@/lib/copy/guide";
import { PROFILE, mindName } from "@/lib/copy/profile";

const SESSION_STEPS = ["review", "listen", "reading", "shadow", "journal", "note"] as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={{ fontFamily: tactile.serif, fontSize: 24, lineHeight: 30, fontWeight: "600", color: tactile.ink }}>
      {children}
    </Text>
  );
}

/** Guia: o método dos 20 minutos, as quatro mentes e a memória, no visual tátil. */
export function GuideScreen() {
  const t = useAreaCopy(GUIDE);
  const profile = useAreaCopy(PROFILE);
  const locale = useLocale();
  const [resetFeedback, setResetFeedback] = useState(false);

  function handleResetHints() {
    resetGuide();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 3000);
  }

  const cast = [
    { who: "einstein", slot: "reading", text: t.castReading },
    { who: "curie", slot: "memory", text: t.castMemory },
    { who: "feynman", slot: "speech", text: t.castSpeech },
    { who: "davinci", slot: "journal", text: t.castJournal },
  ] as const;

  return (
    <TactilePage testID="guide-screen" kicker={t.kicker} title={t.title} dek={t.lead}>
      <TactilePanel>
        <SectionTitle>{t.rhythmTitle}</SectionTitle>
        <BodyText tone="ink">{t.rhythmBody}</BodyText>
        {/* Lista numerada dos passos: a régua da sessão (Hoje) não cabe rótulos longos ("Wiederholen"). */}
        <View testID="guide-steps" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SESSION_STEPS.map((id, index) => (
            <View
              key={id}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tactile.raised, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tactile.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", color: "#FFFFFF" }}>{index + 1}</Text>
              </View>
              <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "700", color: tactile.ink }}>{phaseName(id, locale)}</Text>
            </View>
          ))}
        </View>
        <BodyText tone="muted">{t.rhythmAfter}</BodyText>
      </TactilePanel>

      <TactilePanel>
        <SectionTitle>{t.castTitle}</SectionTitle>
        <BodyText tone="ink">{t.castBody}</BodyText>
        <View style={{ gap: 12 }}>
          {cast.map((item) => (
            <View key={item.who} style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: tactile.raised, borderRadius: 14, padding: 14 }}>
              <CastPortrait who={item.who} size={48} slot={item.slot} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "800", color: tactile.ink }}>{mindName(item.who, profile)}</Text>
                <Text style={{ fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: tactile.muted }}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </TactilePanel>

      <TactilePanel>
        <SectionTitle>{t.memoryTitle}</SectionTitle>
        <BodyText tone="ink">{t.memoryBody}</BodyText>
        <BodyText tone="muted">{t.memoryNote}</BodyText>
      </TactilePanel>

      <TactilePanel>
        <SectionTitle>{t.hintsTitle}</SectionTitle>
        <BodyText tone="ink">{t.hintsBody}</BodyText>
        <View style={{ alignSelf: "flex-start", gap: 10 }}>
          <TactileButton testID="guide-reset-hints" label={resetFeedback ? t.hintsDone : t.hintsButton} variant="secondary" size="md" onPress={handleResetHints} />
          {resetFeedback ? <BodyText tone="muted">{t.hintsFeedback}</BodyText> : null}
        </View>
      </TactilePanel>
    </TactilePage>
  );
}
