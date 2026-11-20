import { Image, StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { useCast } from "@/lib/cast";
import { CORE_SESSION_MINUTES } from "../model/journey-flow";
import { StepAction, StepFrame } from "./step-frame";

export interface WelcomeStepProps {
  onBegin: () => void;
}

/** Retrato público do elenco (mobile/public/cast/<id>.png). */
export function portraitUri(mindId: string): string {
  return `/cast/${mindId}.png`;
}

export function WelcomeStep({ onBegin }: WelcomeStepProps) {
  const t = useAreaCopy(ONBOARDING_COPY);
  const { palette } = useTheme();
  const { people } = useCast();

  return (
    <StepFrame
      testID="onboarding-welcome"
      kicker={t.welcomeKicker}
      title={t.welcomeTitle}
      dek={t.welcomeBody}
      footer={<StepAction label={t.welcomeCta} onPress={onBegin} testID="onboarding-begin" />}
    >
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line, borderBottomColor: palette.outline }]}>
        <View style={[styles.minutesBadge, { backgroundColor: palette.primarySoft, borderColor: palette.primary }]}>
          <Text variant="body" weight="bold" tone="accent" align="center">
            {t.minutesValue(CORE_SESSION_MINUTES)}
          </Text>
        </View>
        <Text variant="body" tone="ink" style={styles.session}>
          {t.welcomeSession(CORE_SESSION_MINUTES)}
        </Text>
      </View>

      <View style={styles.mentors}>
        <Text variant="label" weight="semibold" tone="muted">
          {t.welcomeMentors}
        </Text>
        <View style={styles.mentorRow}>
          {people.map((mind) => (
            <View key={mind.slot} style={styles.mentor} testID={`onboarding-mentor-${mind.slot}`}>
              <View style={[styles.portraitFrame, { borderColor: palette.line, borderBottomColor: palette.outline, backgroundColor: palette.sunken }]}>
                <Image
                  source={{ uri: portraitUri(mind.id) }}
                  style={styles.portrait}
                  accessibilityLabel={mind.name}
                  resizeMode="cover"
                />
              </View>
              <Text variant="body-sm" weight="bold" tone="ink" align="center" numberOfLines={1}>
                {mind.name}
              </Text>
              <Text variant="caption" tone="muted" align="center" numberOfLines={1}>
                {t.roles[mind.slot]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderBottomWidth: 4,
  },
  minutesBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  session: {
    flex: 1,
    lineHeight: 22,
  },
  mentors: {
    gap: 12,
  },
  mentorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  mentor: {
    flexGrow: 1,
    flexBasis: 96,
    alignItems: "center",
    gap: 4,
  },
  portraitFrame: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    overflow: "hidden",
  },
  portrait: {
    width: "100%",
    height: "100%",
  },
});
