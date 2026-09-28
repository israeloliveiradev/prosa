import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { Icon } from "@/components/shell/icon";
import { Field, Panel, PanelHead, SoftInput } from "@/components/shell/panel";
import { ThemeSwitch } from "@/theme/theme-switch";
import {
  changeAccountPassword,
  confirmEmailChange,
  confirmEmailFactor,
  confirmTotp,
  disableEmailFactor,
  disableTotp,
  fetchAccountSettings,
  requestEmailChange,
  saveAccountSettings,
  startEmailFactor,
  startTotp,
  type AccountSettings,
} from "@/lib/api";
import { tap } from "@/lib/haptics";
import { Figure } from "@/components/cast/figure";
import { CAST_SLOTS, mindsForSlot, type CastSlot, type MindId } from "@/design/minds";
import { hydrateCast, mindCopy, setCastSlot, useCast } from "@/lib/cast";
import { getLocale, hydrateLocale, useCopy, type DisplayLocale } from "@/lib/i18n";
import { rememberProfile, useSession } from "@/lib/session";
import { keepWords } from "@/lib/text";
import { useTheme } from "@/theme/ThemeContext";

const TABS = [
  { id: "profile", key: "settingsProfile", icon: "user" },
  { id: "cast", key: "settingsCast", icon: "users" },
  { id: "access", key: "settingsAccess", icon: "lock" },
  { id: "security", key: "settingsSecurity", icon: "shield" },
  { id: "locale", key: "settingsLocale", icon: "globe" },
  { id: "reminders", key: "settingsReminders", icon: "bell" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsScreen() {
  const copy = useCopy();
  const { palette } = useTheme();
  const session = useSession();
  const [tab, setTab] = useState<Tab>("profile");
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [factorCode, setFactorCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace("/account");
      return;
    }
    void fetchAccountSettings(session.token)
      .then((next) => {
        setSettings(next);
        setName(next.display_name ?? "");
        hydrateLocale(next.display_locale);
        hydrateCast({
          reading: next.mind_reading,
          memory: next.mind_memory,
          speech: next.mind_speech,
          journal: next.mind_journal,
        });
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "As configurações não abriram.");
      });
  }, [session]);

  if (!session) {
    return null;
  }

  async function patch(input: Parameters<typeof saveAccountSettings>[1]) {
    if (!session) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await saveAccountSettings(session.token, input);
      setSettings(next);
      rememberProfile({
        display_name: next.display_name,
        display_locale: next.display_locale,
        reminder_enabled: next.reminder_enabled,
        reminder_hour: next.reminder_hour,
        mind_reading: next.mind_reading,
        mind_memory: next.mind_memory,
        mind_speech: next.mind_speech,
        mind_journal: next.mind_journal,
      });
      hydrateCast({
        reading: next.mind_reading,
        memory: next.mind_memory,
        speech: next.mind_speech,
        journal: next.mind_journal,
      });
      hydrateLocale(next.display_locale);
      void tap("light");
      setNote(copy.saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppFrame>
      <Text className="font-label text-[11px] uppercase tracking-[0.22em] text-ember">{keepWords(copy.account)}</Text>
      <Text className="font-displayItalic mt-3 text-display text-ink">{keepWords(copy.settings)}</Text>
      <Text className="mt-3 text-lg text-muted">{session.user.email}</Text>
      <View className="mt-10 gap-8 lg:flex-row lg:items-start">
        <View className="gap-2 rounded-[28px] border border-line bg-card p-3 lg:w-64">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setTab(item.id);
                  setNote(null);
                  setError(null);
                }}
                className={`min-h-14 cursor-pointer flex-row items-center gap-3 rounded-2xl px-4 ${active ? "bg-emberSoft" : "bg-transparent"}`}
              >
                <Icon name={item.icon} color={active ? palette.primary : palette.onSurfaceVariant} />
                <Text className={`font-label text-base ${active ? "text-ember" : "text-ink"}`}>{keepWords(copy[item.key])}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="min-w-0 flex-1 gap-6">
          {tab === "profile" ? (
            <Panel>
              <PanelHead title={copy.settingsProfile} dek={copy.profileDek} />
              <Field label={copy.displayName}>
                <SoftInput value={name} onChangeText={setName} label={copy.displayName} />
              </Field>
              <Text className="mb-5 text-sm leading-6 text-muted">{keepWords(copy.displayNameHint)}</Text>
              <ChunkButton label={pending ? "..." : copy.saveName} disabled={pending || name.trim().length < 2} onPress={() => void patch({ display_name: name.trim() })} />
              <View className="mt-8 border-t border-line pt-6">
                <Text className="mb-4 font-label text-sm text-muted">{keepWords(copy.theme)}</Text>
                <ThemeSwitch />
              </View>
            </Panel>
          ) : null}
          {tab === "cast" ? (
            <CastPanel
              pending={pending}
              onPick={(slot, id) => {
                setCastSlot(slot, id);
                const field =
                  slot === "reading"
                    ? "mind_reading"
                    : slot === "memory"
                      ? "mind_memory"
                      : slot === "speech"
                        ? "mind_speech"
                        : "mind_journal";
                void patch({ [field]: id });
              }}
            />
          ) : null}
          {tab === "access" ? (
            <View className="gap-6">
              <Panel>
                <PanelHead title={copy.passwordSection} dek={copy.passwordDek} />
                <Field label={copy.currentPassword}>
                  <SoftInput value={currentPassword} onChangeText={setCurrentPassword} label={copy.currentPassword} secure />
                </Field>
                <Field label={copy.newPassword}>
                  <SoftInput value={password} onChangeText={setPassword} label={copy.newPassword} secure />
                </Field>
                <ChunkButton
                  label={copy.changePassword}
                  disabled={pending || currentPassword.length < 8 || password.length < 8}
                  onPress={() => {
                    setPending(true);
                    setError(null);
                    void changeAccountPassword(session.token, currentPassword, password)
                      .then(() => {
                        setPassword("");
                        setNote(copy.saved);
                      })
                      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "A senha não mudou."))
                      .finally(() => setPending(false));
                  }}
                />
              </Panel>
              <Panel>
                <PanelHead title={copy.emailSection} dek={copy.emailDek} />
                <Field label={copy.newEmail}>
                  <SoftInput value={nextEmail} onChangeText={setNextEmail} label={copy.newEmail} email />
                </Field>
                <ChunkButton
                  label={copy.sendEmailCode}
                  disabled={pending || currentPassword.length < 8 || !nextEmail.includes("@")}
                  onPress={() => {
                    setPending(true);
                    setError(null);
                    void requestEmailChange(session.token, currentPassword, nextEmail)
                      .then(() => setNote(copy.forgotHint))
                      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O código não saiu."))
                      .finally(() => setPending(false));
                  }}
                />
                <View className="mt-6">
                  <Field label={copy.resetCode}>
                    <SoftInput value={emailCode} onChangeText={setEmailCode} label={copy.resetCode} code />
                  </Field>
                  <ChunkButton
                    label={copy.confirmEmail}
                    disabled={pending || emailCode.length !== 6}
                    onPress={() => {
                      setPending(true);
                      setError(null);
                      void confirmEmailChange(session.token, emailCode)
                        .then((email) => {
                          rememberProfile({ email });
                          setNote(copy.saved);
                          setEmailCode("");
                        })
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O e-mail não mudou."))
                        .finally(() => setPending(false));
                    }}
                  />
                </View>
              </Panel>
            </View>
          ) : null}
          {tab === "security" ? (
            <View className="gap-6">
              <Panel>
                <PanelHead title={copy.twoFactor} dek={copy.securityDek} />
                {totpSecret ? (
                  <View className="mb-5 rounded-2xl bg-paper px-4 py-4">
                    <Text className="font-label text-sm text-ember">{keepWords(copy.totpSecret)}</Text>
                    <Text selectable className="mt-2 font-label text-lg tracking-widest text-ink">
                      {totpSecret}
                    </Text>
                  </View>
                ) : null}
                {recovery.length > 0 ? (
                  <View className="mb-5 rounded-2xl bg-paper px-4 py-4">
                    <Text className="text-base text-muted">{keepWords(copy.recoveryCodes)}</Text>
                    {recovery.map((item) => (
                      <Text key={item} selectable className="mt-2 font-label text-base text-ink">
                        {item}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Field label={copy.resetCode}>
                  <SoftInput value={totpCode} onChangeText={setTotpCode} label={copy.resetCode} code />
                </Field>
                <View className="gap-3">
                  <ChunkButton
                    label={copy.totpStart}
                    disabled={pending || Boolean(settings?.totp_enabled)}
                    onPress={() => {
                      setPending(true);
                      void startTotp(session.token)
                        .then((next) => setTotpSecret(next.secret))
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "A chave não abriu."))
                        .finally(() => setPending(false));
                    }}
                  />
                  <ChunkButton
                    label={copy.totpConfirm}
                    disabled={pending || totpCode.length !== 6}
                    onPress={() => {
                      setPending(true);
                      void confirmTotp(session.token, totpCode)
                        .then((codes) => {
                          setRecovery(codes);
                          setTotpSecret(null);
                          setSettings((current) => (current ? { ...current, totp_enabled: true } : current));
                          setNote(copy.saved);
                        })
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O código não conferiu."))
                        .finally(() => setPending(false));
                    }}
                  />
                </View>
                <View className="mt-6 border-t border-line pt-6">
                  <Field label={copy.currentPassword}>
                    <SoftInput value={currentPassword} onChangeText={setCurrentPassword} label={copy.currentPassword} secure />
                  </Field>
                  <ChunkButton
                    label={copy.totpDisable}
                    disabled={pending || currentPassword.length < 8 || totpCode.length < 6}
                    tone="ghost"
                    onPress={() => {
                      setPending(true);
                      void disableTotp(session.token, currentPassword, totpCode)
                        .then(() => {
                          setSettings((current) => (current ? { ...current, totp_enabled: false } : current));
                          setNote(copy.saved);
                        })
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O autenticador não desligou."))
                        .finally(() => setPending(false));
                    }}
                  />
                </View>
              </Panel>
              <Panel>
                <PanelHead title={copy.emailFactor} dek={copy.forgotHint} />
                <Field label={copy.resetCode}>
                  <SoftInput value={factorCode} onChangeText={setFactorCode} label={copy.resetCode} code />
                </Field>
                <View className="gap-3">
                  <ChunkButton
                    label={copy.emailFactorStart}
                    disabled={pending || Boolean(settings?.email_2fa)}
                    onPress={() => {
                      setPending(true);
                      void startEmailFactor(session.token)
                        .then(() => setNote(copy.forgotHint))
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O código não saiu."))
                        .finally(() => setPending(false));
                    }}
                  />
                  <ChunkButton
                    label={copy.emailFactorConfirm}
                    disabled={pending || factorCode.length !== 6}
                    onPress={() => {
                      setPending(true);
                      void confirmEmailFactor(session.token, factorCode)
                        .then(() => {
                          setSettings((current) => (current ? { ...current, email_2fa: true } : current));
                          setNote(copy.saved);
                        })
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O código não conferiu."))
                        .finally(() => setPending(false));
                    }}
                  />
                  <ChunkButton
                    label={copy.emailFactorOff}
                    disabled={pending || currentPassword.length < 8}
                    tone="ghost"
                    onPress={() => {
                      setPending(true);
                      void disableEmailFactor(session.token, currentPassword)
                        .then(() => {
                          setSettings((current) => (current ? { ...current, email_2fa: false } : current));
                          setNote(copy.saved);
                        })
                        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O 2FA não desligou."))
                        .finally(() => setPending(false));
                    }}
                  />
                </View>
              </Panel>
            </View>
          ) : null}
          {tab === "locale" ? (
            <Panel>
              <PanelHead title={copy.settingsLocale} dek={copy.localeHint} />
              <View className="gap-3">
                {(["pt", "en"] as DisplayLocale[]).map((item) => {
                  const active = settings?.display_locale === item;
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => void patch({ display_locale: item })}
                      className={`min-h-16 cursor-pointer justify-center rounded-2xl px-5 ${active ? "bg-ember" : "border border-line bg-paper"}`}
                    >
                      <Text className={`font-label text-base ${active ? "text-onEmber" : "text-ink"}`}>{item === "pt" ? "Português" : "English"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Panel>
          ) : null}
          {tab === "reminders" ? (
            <Panel>
              <PanelHead title={copy.settingsReminders} dek={copy.reminderHint} />
              {settings?.mail_inbox_url ? (
                <View className="mb-5">
                  <ChunkButton label={copy.mailBox} tone="ghost" onPress={() => void Linking.openURL(settings.mail_inbox_url ?? "http://localhost:8025")} />
                </View>
              ) : (
                <Text className="mb-5 text-base leading-7 text-ember">{keepWords(copy.mailOff)}</Text>
              )}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: Boolean(settings?.reminder_enabled) }}
                onPress={() => void patch({ reminder_enabled: !settings?.reminder_enabled })}
                className={`mb-5 min-h-16 cursor-pointer justify-center rounded-2xl px-5 ${settings?.reminder_enabled ? "bg-ember" : "border border-line bg-paper"}`}
              >
                <Text className={`font-label text-base ${settings?.reminder_enabled ? "text-onEmber" : "text-ink"}`}>{keepWords(copy.reminderOn)}</Text>
              </Pressable>
              <Field label={copy.reminderHour}>
                <SoftInput value={String(settings?.reminder_hour ?? 8)} onChangeText={(value) => {
                  const hour = Number(value);
                  if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
                    void patch({ reminder_hour: hour });
                  }
                }} label={copy.reminderHour} code />
              </Field>
            </Panel>
          ) : null}
          {note ? <Text className="text-base text-moss">{keepWords(note)}</Text> : null}
          {error ? <Text className="text-base text-roseInk">{keepWords(error)}</Text> : null}
        </View>
      </View>
    </AppFrame>
  );
}

function CastPanel({ pending, onPick }: { pending: boolean; onPick: (slot: CastSlot, id: MindId) => void }) {
  const copy = useCopy();
  const locale = getLocale();
  const { picks } = useCast();
  return (
    <View className="gap-6">
      <Panel>
        <PanelHead title={copy.settingsCast} dek={copy.castDek} />
        {CAST_SLOTS.map((slot) => {
          const options = mindsForSlot(slot);
          const selected = picks[slot];
          const role = options[0] ? mindCopy(options[0], locale).role : slot;
          return (
            <View key={slot} className="mb-8 last:mb-0">
              <Text className="font-label text-[11px] uppercase tracking-[0.22em] text-ember">{keepWords(role)}</Text>
              <View className="mt-4 gap-3">
                {options.map((mind) => {
                  const active = mind.id === selected;
                  const text = mindCopy(mind, locale);
                  return (
                    <Pressable
                      key={mind.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled: pending }}
                      onPress={() => onPick(slot, mind.id)}
                      className={`min-h-20 cursor-pointer flex-row items-center gap-4 rounded-[24px] px-4 py-4 ${active ? "bg-emberSoft" : "border border-line bg-paper"}`}
                    >
                      <Figure who={mind.id} size={64} />
                      <View className="min-w-0 flex-1">
                        <Text className={`font-displayItalic text-2xl ${active ? "text-ember" : "text-ink"}`}>{mind.name}</Text>
                        <Text className="mt-1 text-sm text-muted">{mind.years}</Text>
                        <Text className="mt-2 text-base leading-6 text-ink">{keepWords(text.bio)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </Panel>
    </View>
  );
}
