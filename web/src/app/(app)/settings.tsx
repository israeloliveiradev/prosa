import { Redirect, router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { loadAccountSettings, saveReminders } from "@/api/account-extras";
import { saveAccountPrefs } from "@/api/onboarding";
import type { AccountMinutes } from "@/api/schemas/auth";
import { languageLabel } from "@/components/persona/talk-logic";
import { VoicePicker } from "@/components/session/voice-picker";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { BodyText, TactilePage } from "@/features/shell/tactile-page";
import { changeAccountPassword } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { SETTINGS } from "@/lib/copy/settings";
import { tap } from "@/lib/haptics";
import { DISPLAY_LOCALES, LOCALE_BCP47, setLocale, useLocale, type DisplayLocale } from "@/lib/i18n";
import { refreshSession, rememberProfile, signOut, useSession } from "@/lib/session";

type SaveState = "saving" | "saved" | "failed";

const MINUTES: readonly AccountMinutes[] = [10, 20, 30];

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function Section({ title, dek, testID, children }: { title: string; dek?: string; testID: string; children: ReactNode }) {
  return (
    <TactilePanel testID={testID}>
      <Text accessibilityRole="header" style={{ fontFamily: tactile.font, fontSize: 18, fontWeight: "800", color: tactile.ink }}>
        {title}
      </Text>
      {dek ? <BodyText tone="muted">{dek}</BodyText> : null}
      {children}
    </TactilePanel>
  );
}

function Note({ state, t }: { state: SaveState | undefined; t: { saving: string; saved: string; saveFailed: string } }) {
  if (!state) {
    return null;
  }
  return (
    <Text accessibilityLiveRegion="polite" style={{ fontFamily: tactile.font, fontSize: 14, color: state === "failed" ? tactile.danger : tactile.muted }}>
      {state === "saving" ? t.saving : state === "saved" ? t.saved : t.saveFailed}
    </Text>
  );
}

const inputStyle = {
  fontFamily: tactile.font,
  fontSize: 16,
  color: tactile.ink,
  backgroundColor: tactile.surface,
  borderWidth: 1.5,
  borderColor: tactile.border,
  borderRadius: 14,
  paddingHorizontal: 14,
  minHeight: 48,
} as const;

/** Ajustes: só o que existe de verdade (idioma, voz, meta diária, lembrete por e-mail, conta). */
export default function SettingsScreen() {
  const t = useAreaCopy(SETTINGS);
  const onboarding = useAreaCopy(ONBOARDING_COPY);
  const locale = useLocale();
  const session = useSession();
  const [localeState, setLocaleState] = useState<SaveState>();
  const [minutesState, setMinutesState] = useState<SaveState>();
  const [reminderState, setReminderState] = useState<SaveState>();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordState, setPasswordState] = useState<SaveState>();
  const [leaving, setLeaving] = useState(false);
  const token = session?.token;
  const settings = useQuery({
    queryKey: ["account-settings", session?.user.id],
    queryFn: ({ signal }) => loadAccountSettings(signal),
    enabled: Boolean(token),
    retry: false,
  });

  if (!session || !token) {
    return <Redirect href="/account" />;
  }
  const user = session.user;
  const tag = LOCALE_BCP47[locale];
  const goal = user.goal ?? null;

  async function chooseLocale(code: DisplayLocale) {
    if (code === locale) {
      return;
    }
    void tap("light");
    setLocale(code);
    setLocaleState("saving");
    try {
      const saved = await saveAccountPrefs({ display_locale: code });
      rememberProfile({ display_locale: saved.display_locale });
      setLocaleState("saved");
    } catch {
      setLocaleState("failed");
    }
  }

  async function chooseMinutes(minutes: AccountMinutes) {
    if (minutes === user.daily_minutes) {
      return;
    }
    void tap("light");
    setMinutesState("saving");
    try {
      const saved = await saveAccountPrefs({ daily_minutes: minutes });
      rememberProfile({ daily_minutes: saved.daily_minutes ?? minutes });
      setMinutesState("saved");
    } catch {
      setMinutesState("failed");
    }
  }

  async function updateReminders(patch: { reminder_enabled?: boolean; reminder_hour?: number }) {
    setReminderState("saving");
    try {
      await saveReminders(patch);
      await settings.refetch();
      setReminderState("saved");
    } catch {
      setReminderState("failed");
    }
  }

  async function updatePassword() {
    if (passwordState === "saving") {
      return;
    }
    setPasswordState("saving");
    try {
      await changeAccountPassword(token as string, current, next);
      setCurrent("");
      setNext("");
      setPasswordState("saved");
      void refreshSession();
    } catch {
      setPasswordState("failed");
    }
  }

  async function leave() {
    if (leaving) {
      return;
    }
    setLeaving(true);
    try {
      await signOut();
    } finally {
      router.replace("/account");
    }
  }

  const reminders = settings.data;
  const hour = reminders?.reminder_hour ?? 0;

  return (
    <TactilePage testID="settings-screen" kicker={t.kicker} title={t.title} dek={t.dek}>
      <Section testID="settings-language" title={t.langTitle}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {DISPLAY_LOCALES.map((code) => (
            <TactileButton
              key={code}
              testID={`settings-locale-${code}`}
              label={languageLabel(code, LOCALE_BCP47[code])}
              accessibilityLabel={languageLabel(code, tag)}
              variant={code === locale ? "primary" : "secondary"}
              size="sm"
              onPress={() => void chooseLocale(code)}
            />
          ))}
        </View>
        <Note state={localeState} t={t} />
      </Section>

      <Section testID="settings-voice" title={t.voiceTitle} dek={t.voiceDek}>
        <VoicePicker language={user.target_lang ?? "en"} />
      </Section>

      <Section testID="settings-plan" title={t.planTitle}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {MINUTES.map((minutes) => (
            <TactileButton
              key={minutes}
              testID={`settings-minutes-${minutes}`}
              label={fill(t.minutes, { n: minutes })}
              variant={minutes === user.daily_minutes ? "primary" : "secondary"}
              size="sm"
              onPress={() => void chooseMinutes(minutes)}
            />
          ))}
        </View>
        <Note state={minutesState} t={t} />
        <BodyText tone={goal ? "ink" : "muted"} testID="settings-goal">
          {goal ? `${t.goalLabel}: ${onboarding.goals[goal].title}${user.goal_note ? ` · ${user.goal_note}` : ""}` : t.goalNone}
        </BodyText>
        <View style={{ alignSelf: "flex-start" }}>
          <TactileButton testID="settings-edit-goal" label={t.editGoal} variant="secondary" size="sm" onPress={() => router.push("/quiz")} />
        </View>
      </Section>

      <Section testID="settings-reminders" title={t.remindersTitle} dek={reminders?.mail_configured ? t.remindersDek : undefined}>
        {settings.isError ? (
          <View style={{ gap: 10 }}>
            <BodyText tone="danger">{t.settingsFailed}</BodyText>
            <View style={{ alignSelf: "flex-start" }}>
              <TactileButton testID="settings-reminders-retry" label={t.retry} variant="secondary" size="sm" onPress={() => void settings.refetch()} />
            </View>
          </View>
        ) : reminders && !reminders.mail_configured ? (
          <BodyText tone="muted" testID="settings-reminders-unavailable">
            {t.remindersUnavailable}
          </BodyText>
        ) : reminders ? (
          <View style={{ gap: 10 }}>
            <View style={{ alignSelf: "flex-start" }}>
              <TactileButton
                testID="settings-reminder-toggle"
                label={reminders.reminder_enabled ? t.reminderOn : t.reminderOff}
                variant={reminders.reminder_enabled ? "primary" : "secondary"}
                size="sm"
                onPress={() => void updateReminders({ reminder_enabled: !reminders.reminder_enabled })}
              />
            </View>
            {reminders.reminder_enabled ? (
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <TactileButton testID="settings-hour-earlier" label="−" accessibilityLabel={t.hourEarlier} variant="secondary" size="sm" onPress={() => void updateReminders({ reminder_hour: (hour + 23) % 24 })} />
                <BodyText tone="ink" testID="settings-reminder-hour">
                  {fill(t.reminderHour, { hour: `${String(hour).padStart(2, "0")}:00` })}
                </BodyText>
                <TactileButton testID="settings-hour-later" label="+" accessibilityLabel={t.hourLater} variant="secondary" size="sm" onPress={() => void updateReminders({ reminder_hour: (hour + 1) % 24 })} />
              </View>
            ) : null}
            <Note state={reminderState} t={t} />
          </View>
        ) : null}
      </Section>

      <Section testID="settings-account" title={t.accountTitle}>
        <BodyText testID="settings-email">{fill(t.email, { email: user.email })}</BodyText>
        <BodyText tone="muted">{user.plan === "pro" ? t.planPro : t.planFree}</BodyText>
        <View style={{ alignSelf: "flex-start" }}>
          <TactileButton testID="settings-open-paywall" label={t.openPlan} variant="secondary" size="sm" onPress={() => router.push("/paywall")} />
        </View>

        <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "800", color: tactile.ink, marginTop: 8 }}>{t.passwordTitle}</Text>
        <TextInput testID="settings-password-current" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" placeholder={t.currentPassword} accessibilityLabel={t.currentPassword} placeholderTextColor={tactile.faint} style={inputStyle} />
        <TextInput testID="settings-password-new" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" placeholder={t.newPassword} accessibilityLabel={t.newPassword} placeholderTextColor={tactile.faint} style={inputStyle} />
        <View style={{ alignSelf: "flex-start" }}>
          <TactileButton testID="settings-password-save" label={t.changePassword} variant="secondary" size="sm" disabled={current.length === 0 || next.length < 8 || passwordState === "saving"} onPress={() => void updatePassword()} />
        </View>
        {passwordState === "saved" ? <BodyText testID="settings-password-ok">{t.passwordChanged}</BodyText> : null}
        {passwordState === "failed" ? <BodyText tone="danger" testID="settings-password-error">{t.passwordFailed}</BodyText> : null}
      </Section>

      <View style={{ alignSelf: "flex-start" }}>
        <TactileButton testID="settings-sign-out" label={leaving ? t.signingOut : t.signOut} variant="crimson" disabled={leaving} onPress={() => void leave()} />
      </View>
    </TactilePage>
  );
}
