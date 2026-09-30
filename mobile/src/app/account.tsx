import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { Panel, SoftInput } from "@/components/shell/panel";
import { useTheme } from "@/theme/ThemeContext";
import type { AccountUser } from "@/lib/api";
import { confirmPasswordReset, fetchMailInbox, requestPasswordReset, resendAccountEmail } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { givenName, getLocale, useCopy } from "@/lib/i18n";
import { firstDayHref, syncFirstDay } from "@/lib/first-day";
import { clearLocalProgress, setPro } from "@/lib/progress";
import { finishSignIn, finishVerify, getSession, signIn, signOut, signUp, useSession } from "@/lib/session";
import { wipeDeviceStudy } from "@/lib/wipe-device";
import { normalizeOtp } from "@/lib/otp";
import { passwordStrength } from "@/lib/prefs";
import { keepWords } from "@/lib/text";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function accountMessage(message: string, copy: ReturnType<typeof useCopy>): string {
  if (message.includes("Invalid credentials")) {
    return copy.invalidCredentials;
  }
  if (message.includes("Email already registered")) {
    return copy.emailRegistered;
  }
  if (message.includes("Invalid request")) {
    return copy.checkEmailPassword;
  }
  if (message.includes("Verify code expired")) {
    return copy.verifyExpired;
  }
  if (message.includes("The verification letter did not leave") || message.includes("Mail is not configured")) {
    return copy.mailDidNotLeave;
  }
  return message;
}

export default function AccountScreen() {
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();
  const params = useLocalSearchParams<{ criar?: string }>();
  const [creating, setCreating] = useState(params.criar === "1");
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [level, setLevel] = useState<AccountUser["level"]>("A2");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [inboxUrl, setInboxUrl] = useState<string | null>(null);
  const errorRef = useRef<View>(null);

  useEffect(() => {
    void fetchMailInbox().then(setInboxUrl);
  }, []);

  useEffect(() => {
    if (params.criar === "1") {
      setCreating(true);
    }
  }, [params.criar]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const node = errorRef.current;
    if (!node) {
      return;
    }
    if (Platform.OS === "web") {
      const el = node as unknown as { focus?: () => void };
      el.focus?.();
      return;
    }
    const handle = findNodeHandle(node);
    if (handle) {
      AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [error]);

  async function submit() {
    void tap("medium");
    setPending(true);
    setError(null);
    try {
      const code = normalizeOtp(otp);
      if (verifying) {
        if (code.length !== 6) {
          setError(copy.pasteSixDigits);
          return;
        }
        const user = await finishVerify(email, code);
        setPro(user.plan === "pro");
        setVerifying(false);
      } else if (ticket) {
        const user = await finishSignIn(ticket, code);
        setPro(user.plan === "pro");
        setTicket(null);
      } else if (creating) {
        const next = await signUp({ email, password, native_lang: "pt", target_lang: "en", level, display_locale: getLocale() });
        if ("requires_verify" in next) {
          setVerifying(true);
          setNote(copy.verifyHint);
          setPassword("");
          setError(null);
          return;
        }
        setPro(next.plan === "pro");
      } else {
        const next = await signIn(email, password);
        if ("requires_verify" in next) {
          setVerifying(true);
          setNote(copy.verifyHint);
          return;
        }
        if ("requires_2fa" in next) {
          setTicket(next.ticket);
          setNote(copy.secondFactor);
          return;
        }
        setPro(next.plan === "pro");
      }
      setPassword("");
      setOtp("");
      const opened = getSession();
      if (opened) {
        await syncFirstDay(opened.token, opened.user);
        router.replace(firstDayHref(opened.user.id) as Href);
      }
    } catch (caught) {
      setError(accountMessage(caught instanceof Error ? caught.message : copy.apiSilent, copy));
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    void tap("light");
    setPending(true);
    try {
      const userId = session?.user.id;
      await signOut();
      wipeDeviceStudy(userId);
      clearLocalProgress();
      router.replace("/account");
    } finally {
      setPending(false);
    }
  }

  if (session) {
    return (
      <AppFrame>
        <PageMasthead
          kicker={copy.accountKicker}
          title={copy.account}
          dek={keepWords(copy.signedInDek)}
        />
        <View className="mt-8 gap-3">
          <ActionRow title={copy.settings} detail={copy.profileDek} onPress={() => router.push("/settings" as Href)} />
          <ActionRow title={copy.languageInterests} detail={copy.languageInterestsDetail} onPress={() => router.push("/quiz")} />
          {session.user.role === "admin" ? (
            <ActionRow title={copy.admin} detail={copy.adminDetail} onPress={() => router.push("/admin")} />
          ) : null}
        </View>
        <ChunkButton className="mt-8 w-full max-w-xs" label={pending ? copy.leaving : copy.signOut} onPress={() => void leave()} disabled={pending} tone="ghost" />
      </AppFrame>
    );
  }

  const title = verifying ? copy.verifyTitle : creating ? copy.creatingTitle : copy.signInTitle;
  const dek = verifying ? copy.verifyHint : creating ? copy.firstLessonPair : copy.signedInDek;

  return (
    <AppFrame>
      <View className="w-full lg:flex-row lg:items-start lg:gap-16">
        <View className="w-full min-w-0 lg:w-[44%]">
          <Text className="font-label text-sm text-ember">{copy.accountKicker}</Text>
          <Text className="font-displayItalic mt-3 w-full text-display text-ink">{title}</Text>
          <Text className="mt-4 w-full max-w-md text-lg leading-7 text-muted" style={{ maxWidth: "100%" }}>{dek}</Text>
          <View className="mt-12 hidden items-start lg:flex">
            <View className="rounded-[36px] bg-emberSoft p-5">
              <Figure who="einstein" size={188} />
            </View>
          </View>
        </View>

        <View className="mt-10 w-full max-w-md flex-1 lg:mt-0">
        <Panel>
        <View className="gap-5">
        <View>
          <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">{copy.emailLabel}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            nativeID="account-email"
            accessibilityLabel={copy.emailLabel}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "account-form-error" : undefined}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            placeholder={copy.emailExample}
            placeholderTextColor={palette.onSurfaceVariant}
            className="min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink"
          />
        </View>
        {forgot ? (
          <View className="gap-4">
            <Text className="text-base leading-7 text-muted">{copy.forgotHint}</Text>
            {note ? <Text className="text-base text-moss">{note}</Text> : null}
            <ChunkButton
              label={copy.sendReset}
              disabled={pending || !email.includes("@")}
              onPress={() => {
                setPending(true);
                setError(null);
                void requestPasswordReset(email)
                  .then(() => setNote(copy.forgotHint))
                  .catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : copy.mailDidNotSend);
                  })
                  .finally(() => setPending(false));
              }}
            />
            <Text className="text-sm leading-6 text-muted">{copy.mailOff}</Text>
            {inboxUrl ? (
              <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(inboxUrl)} className="min-h-12 cursor-pointer items-center justify-center">
                <Text className="font-label text-base text-ember">{copy.mailBox}</Text>
              </Pressable>
            ) : null}
            <View>
              <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">{copy.resetCode}</Text>
              <TextInput
                value={resetCode}
                onChangeText={(value) => setResetCode(normalizeOtp(value))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                accessibilityLabel={copy.resetCode}
                placeholder="000000"
                placeholderTextColor={palette.onSurfaceVariant}
                className="min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink"
              />
            </View>
            <View>
              <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">{copy.newPassword}</Text>
              <SoftInput
                value={password}
                onChangeText={setPassword}
                label={copy.newPassword}
                secure
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={copy.passwordPlaceholder}
              />
            </View>
            <ChunkButton
              label={copy.resetSave}
              disabled={pending || resetCode.length !== 6 || password.length < 8}
              onPress={() => {
                setPending(true);
                setError(null);
                void confirmPasswordReset(email, normalizeOtp(resetCode), password)
                  .then(() => {
                    setForgot(false);
                    setNote(copy.saved);
                    setPassword("");
                  })
                  .catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : copy.codeDidNotMatch);
                  })
                  .finally(() => setPending(false));
              }}
            />
            <Pressable accessibilityRole="button" onPress={() => setForgot(false)} className="min-h-12 cursor-pointer items-center justify-center">
              <Text className="font-label text-base text-muted">{copy.backToSignIn}</Text>
            </Pressable>
          </View>
        ) : null}
        {forgot || verifying ? null : (
        <View>
          <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">{copy.passwordLabel}</Text>
          <SoftInput
            value={password}
            onChangeText={setPassword}
            label={copy.passwordLabel}
            nativeID="account-password"
            invalid={Boolean(error)}
            describedBy={error ? "account-form-error" : undefined}
            secure
            autoComplete={creating ? "new-password" : "current-password"}
            textContentType={creating ? "newPassword" : "password"}
            placeholder={copy.passwordPlaceholder}
          />
          {creating ? (
            <Text className="mt-2 text-sm text-muted">
              {passwordStrength(password) === "strong" ? copy.passwordStrong : passwordStrength(password) === "ok" ? copy.passwordOk : copy.passwordWeak}
            </Text>
          ) : null}
        </View>
        )}
        {creating && !forgot && !verifying ? (
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.levelLabel}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={copy.levelLabel} className="mt-3 flex-row flex-wrap gap-2">
              {LEVELS.map((item) => {
                const selected = item === level;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={`Nível ${item}`}
                    accessibilityState={{ selected, checked: selected }}
                    onPress={() => setLevel(item)}
                    className={`h-12 w-12 items-center justify-center rounded-full ${selected ? "bg-ember" : "border border-line bg-paper"}`}
                  >
                    <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-3 text-sm leading-5 text-muted">{copy.firstLessonPair}</Text>
          </View>
        ) : null}
        {error ? (
          <View
            ref={errorRef}
            nativeID="account-form-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            accessible
            focusable
            collapsable={false}
            className="rounded-2xl bg-roseSoft px-4 py-3"
          >
            <Text className="text-base leading-6 text-roseInk">{error}</Text>
          </View>
        ) : null}
        {verifying && !forgot ? (
          <View className="gap-4">
            {note ? <Text className="text-base text-moss">{keepWords(note)}</Text> : null}
            <View>
              <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">{copy.resetCode}</Text>
              <TextInput
                value={otp}
                onChangeText={(value) => {
                  setOtp(normalizeOtp(value));
                  setError(null);
                }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                accessibilityLabel={copy.resetCode}
                placeholder="000000"
                placeholderTextColor={palette.onSurfaceVariant}
                className="min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink"
              />
            </View>
            <ChunkButton
              className="w-full"
              label={pending ? copy.opening : copy.verifySave}
              disabled={pending || otp.length !== 6}
              onPress={() => void submit()}
            />
            <Pressable
              accessibilityRole="button"
              disabled={pending || !email.includes("@")}
              onPress={() => {
                setPending(true);
                setError(null);
                void resendAccountEmail(email)
                  .then(() => setNote(copy.verifyHint))
                  .catch((caught: unknown) => {
                    setError(accountMessage(caught instanceof Error ? caught.message : copy.mailDidNotLeave, copy));
                  })
                  .finally(() => setPending(false));
              }}
              className="min-h-12 cursor-pointer items-center justify-center"
            >
              <Text className="font-label text-base text-ember">{copy.verifyAgain}</Text>
            </Pressable>
            {inboxUrl ? (
              <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(inboxUrl)} className="min-h-12 cursor-pointer items-center justify-center">
                <Text className="font-label text-base text-muted">{copy.mailBox}</Text>
              </Pressable>
            ) : (
              <Text className="text-sm leading-6 text-muted">{copy.mailOff}</Text>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setVerifying(false);
                setOtp("");
                setNote(null);
              }}
              className="min-h-12 cursor-pointer items-center justify-center"
            >
              <Text className="font-label text-base text-muted">{copy.back}</Text>
            </Pressable>
          </View>
        ) : null}
        {forgot || verifying ? null : (
          <>
            {ticket ? (
              <View>
                <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">{copy.secondFactor}</Text>
                <TextInput
                  value={otp}
                  onChangeText={(value) => setOtp(normalizeOtp(value))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  accessibilityLabel={copy.secondFactor}
                  placeholder="000000"
                  placeholderTextColor={palette.onSurfaceVariant}
                  className="min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink"
                />
              </View>
            ) : null}
            <ChunkButton
              className="mt-2 w-full"
              label={pending ? copy.opening : ticket ? copy.finishLogin : creating ? copy.createAccount : copy.signIn}
              onPress={() => {
                if (email.trim().length === 0 || !email.includes("@") || password.length < 8) {
                  setError(copy.checkEmailPassword);
                  return;
                }
                void submit();
              }}
              disabled={pending}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCreating((value) => !value);
                setError(null);
              }}
              className="min-h-12 cursor-pointer items-center justify-center"
            >
              <Text className="font-label text-base text-ember">{creating ? copy.haveAccount : copy.needAccount}</Text>
            </Pressable>
          </>
        )}
        {creating || forgot || verifying ? null : (
          <Pressable accessibilityRole="button" onPress={() => setForgot(true)} className="min-h-12 cursor-pointer items-center justify-center">
            <Text className="font-label text-sm text-muted">{copy.forgot}</Text>
          </Pressable>
        )}
        </View>
        </Panel>
        </View>
      </View>
    </AppFrame>
  );
}
