import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { confirmPasswordReset, fetchMailInbox, requestPasswordReset, resendAccountEmail } from "@/api/auth";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { TactileLogo } from "@/components/tactile/tactile-logo";
import { tactile, ledge } from "@/components/tactile/tokens";
import { LanguageChoice } from "@/features/auth/components/language-choice";
import { LocaleMenu } from "@/features/auth/components/locale-menu";
import { TactileField } from "@/features/auth/components/tactile-field";
import {
  STUDY_TARGETS,
  SUPPORT_LANGS,
  accountErrorMessage,
  changePair,
  classifySignIn,
  cooldownLeft,
  defaultPair,
  isEmail,
  passwordAccepted,
  passwordStrengthOf,
  secondFactorCode,
  sixDigitCode,
  type LanguagePair,
} from "@/features/auth/model/account-model";
import { holdEntry } from "@/features/auth/model/entry-hold";
import { languageLabel } from "@/features/shell/model/shell-model";
import { ACCOUNT_COPY, type AccountCopy } from "@/lib/copy/account";
import { useAreaCopy } from "@/lib/copy/area";
import { firstDayHref, syncFirstDay } from "@/lib/first-day";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { finishSignIn, finishVerify, getSession, sendLoginCode, signIn, signUp } from "@/lib/session";

type Step =
  | { kind: "signIn" }
  | { kind: "signUp" }
  | { kind: "code" }
  | { kind: "verify"; email: string; via: "signUp" | "signIn" | "code" }
  | { kind: "twoFactor"; ticket: string; methods: Array<"totp" | "email"> }
  | { kind: "forgot" }
  | { kind: "reset"; email: string };

type FieldErrors = { email?: string; password?: string; code?: string };

const CAST = ["einstein", "curie", "feynman", "davinci"] as const;

function initialStep(mode: string | undefined, legacyCreate: string | undefined): Step {
  if (mode === "signup" || legacyCreate === "1") {
    return { kind: "signUp" };
  }
  if (mode === "code") {
    return { kind: "code" };
  }
  if (mode === "forgot") {
    return { kind: "forgot" };
  }
  return { kind: "signIn" };
}

export function AccountScreen() {
  const t = useAreaCopy(ACCOUNT_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const params = useLocalSearchParams<{ mode?: string; email?: string; criar?: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 960;

  const [step, setStep] = useState<Step>(() => initialStep(params.mode, params.criar));
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pair, setPair] = useState<LanguagePair>(() => defaultPair(locale));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<"codeSent" | "passwordSaved" | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [inboxUrl, setInboxUrl] = useState<string | null>(null);

  const nameFor = useCallback((code: string) => languageLabel(code, bcp47), [bcp47]);
  const wait = cooldownLeft(sentAt, now);

  useEffect(() => {
    let alive = true;
    void fetchMailInbox().then((url) => {
      if (alive) {
        setInboxUrl(url);
      }
    });
    return () => {
      alive = false;
      holdEntry(false);
    };
  }, []);

  useEffect(() => {
    if (wait <= 0) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [wait]);

  function go(next: Step) {
    setStep(next);
    setError(null);
    setFieldErrors({});
    setCode("");
    if (next.kind !== "signIn") {
      setNotice(null);
    }
  }

  function markSent() {
    const stamp = Date.now();
    setSentAt(stamp);
    setNow(stamp);
    setNotice("codeSent");
  }

  /** Sessão aberta: espera a jornada do primeiro dia sincronizar e segue para /start ou /. */
  async function enter() {
    const opened = getSession();
    if (!opened) {
      holdEntry(false);
      return;
    }
    try {
      await syncFirstDay(opened.token, opened.user);
    } catch {
      // Sem rede: o guarda de rota decide com o que o aparelho sabe.
    }
    holdEntry(false);
    router.replace(firstDayHref(opened.user.id) as Href);
  }

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      holdEntry(false);
      const message = accountErrorMessage(caught, t as unknown as Record<string, unknown>);
      if (message === t.secondFactorExpired) {
        go({ kind: "signIn" });
      }
      setError(message);
    } finally {
      setPending(false);
    }
  }

  function checkEmail(errors: FieldErrors): boolean {
    if (!isEmail(email)) {
      errors.email = t.invalidEmail;
      return false;
    }
    return true;
  }

  function submitSignIn() {
    const errors: FieldErrors = {};
    checkEmail(errors);
    if (!passwordAccepted(password)) {
      errors.password = t.shortPassword;
    }
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }
    void run(async () => {
      holdEntry(true);
      const result = await signIn(email.trim(), password);
      const outcome = classifySignIn(result, email.trim());
      if (outcome.kind === "session") {
        setPassword("");
        await enter();
        return;
      }
      holdEntry(false);
      setPassword("");
      if (outcome.kind === "verify") {
        go({ kind: "verify", email: outcome.email, via: "signIn" });
        markSent();
        return;
      }
      go({ kind: "twoFactor", ticket: outcome.ticket, methods: outcome.methods });
    });
  }

  function submitSignUp() {
    const errors: FieldErrors = {};
    checkEmail(errors);
    if (!passwordAccepted(password)) {
      errors.password = t.shortPassword;
    }
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }
    void run(async () => {
      holdEntry(true);
      const result = await signUp({
        email: email.trim(),
        password,
        native_lang: pair.support,
        target_lang: pair.target,
        display_locale: locale,
      });
      const outcome = classifySignIn(result, email.trim());
      setPassword("");
      if (outcome.kind === "session") {
        await enter();
        return;
      }
      holdEntry(false);
      if (outcome.kind === "verify") {
        go({ kind: "verify", email: outcome.email, via: "signUp" });
        markSent();
      }
    });
  }

  function submitCodeRequest() {
    const errors: FieldErrors = {};
    checkEmail(errors);
    setFieldErrors(errors);
    if (errors.email) {
      return;
    }
    void run(async () => {
      const challenge = await sendLoginCode(email.trim());
      go({ kind: "verify", email: challenge.email || email.trim(), via: "code" });
      markSent();
    });
  }

  function submitVerify(target: string) {
    if (code.length !== 6) {
      setFieldErrors({ code: t.sixDigits });
      return;
    }
    setFieldErrors({});
    void run(async () => {
      holdEntry(true);
      await finishVerify(target, code);
      await enter();
    });
  }

  function resend(target: string, via: "signUp" | "signIn" | "code") {
    void run(async () => {
      if (via === "code") {
        await sendLoginCode(target);
      } else {
        await resendAccountEmail(target);
      }
      markSent();
    });
  }

  function submitTwoFactor(ticket: string) {
    if (!code) {
      setFieldErrors({ code: t.codeRequired });
      return;
    }
    setFieldErrors({});
    void run(async () => {
      holdEntry(true);
      await finishSignIn(ticket, code);
      await enter();
    });
  }

  function submitForgot() {
    const errors: FieldErrors = {};
    checkEmail(errors);
    setFieldErrors(errors);
    if (errors.email) {
      return;
    }
    void run(async () => {
      await requestPasswordReset(email.trim());
      go({ kind: "reset", email: email.trim() });
      markSent();
    });
  }

  function submitReset(target: string) {
    const errors: FieldErrors = {};
    if (code.length !== 6) {
      errors.code = t.sixDigits;
    }
    if (!passwordAccepted(password)) {
      errors.password = t.shortPassword;
    }
    setFieldErrors(errors);
    if (errors.code || errors.password) {
      return;
    }
    void run(async () => {
      await confirmPasswordReset(target, code, password);
      setPassword("");
      setSentAt(null);
      go({ kind: "signIn" });
      setNotice("passwordSaved");
    });
  }

  const strength = password ? passwordStrengthOf(password) : null;
  const strengthText = strength === "strong" ? t.passwordStrong : strength === "ok" ? t.passwordOk : strength === "weak" ? t.passwordWeak : null;

  const heading = useMemo(() => headingFor(step, t), [step, t]);

  const emailField = (
    <TactileField
      testID="account-email"
      label={t.emailLabel}
      kind="email"
      value={email}
      onChangeText={(value) => {
        setEmail(value);
        setFieldErrors((current) => ({ ...current, email: undefined }));
      }}
      placeholder={t.emailPlaceholder}
      autoComplete="email"
      textContentType="emailAddress"
      error={fieldErrors.email}
      returnKeyType="next"
    />
  );

  const codeField = (onSubmit: () => void) => (
    <TactileField
      testID="account-code"
      label={t.codeLabel}
      kind="code"
      value={code}
      onChangeText={(value) => {
        setCode(sixDigitCode(value));
        setFieldErrors((current) => ({ ...current, code: undefined }));
      }}
      placeholder="000000"
      maxLength={6}
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      error={fieldErrors.code}
      onSubmitEditing={onSubmit}
      returnKeyType="go"
    />
  );

  let body: ReactNode = null;
  if (step.kind === "signIn") {
    body = (
      <>
        {emailField}
        <TactileField
          testID="account-password"
          label={t.passwordLabel}
          kind="password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          placeholder={t.passwordPlaceholder}
          autoComplete="current-password"
          textContentType="password"
          error={fieldErrors.password}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          onSubmitEditing={submitSignIn}
          returnKeyType="go"
        />
        <Primary testID="account-submit" label={pending ? t.opening : t.signInAction} disabled={pending} onPress={submitSignIn} />
        <LinkRow>
          <TextLink testID="account-use-code" label={t.useCode} onPress={() => go({ kind: "code" })} />
          <TextLink testID="account-forgot" label={t.forgotLink} onPress={() => go({ kind: "forgot" })} muted />
        </LinkRow>
      </>
    );
  } else if (step.kind === "signUp") {
    body = (
      <>
        {emailField}
        <TactileField
          testID="account-password"
          label={t.passwordLabel}
          kind="password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          placeholder={t.passwordPlaceholder}
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.password}
          hint={strengthText}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
        />
        <LanguageChoice
          testID="account-target"
          label={t.targetLabel}
          options={STUDY_TARGETS}
          value={pair.target}
          onChange={(value) => setPair((current) => changePair(current, "target", value))}
          nameFor={nameFor}
        />
        <LanguageChoice
          testID="account-support"
          label={t.supportLabel}
          hint={t.supportHint}
          options={SUPPORT_LANGS}
          value={pair.support}
          onChange={(value) => setPair((current) => changePair(current, "support", value))}
          nameFor={nameFor}
        />
        <Primary testID="account-submit" label={pending ? t.sending : t.signUpAction} disabled={pending} onPress={submitSignUp} />
      </>
    );
  } else if (step.kind === "code") {
    body = (
      <>
        {emailField}
        <Primary testID="account-submit" label={pending ? t.sending : t.sendCodeAction} disabled={pending} onPress={submitCodeRequest} />
        <LinkRow>
          <TextLink testID="account-use-password" label={t.usePassword} onPress={() => go({ kind: "signIn" })} />
        </LinkRow>
      </>
    );
  } else if (step.kind === "verify") {
    const current = step;
    body = (
      <>
        {codeField(() => submitVerify(current.email))}
        <Primary testID="account-submit" label={pending ? t.opening : t.verifyAction} disabled={pending} onPress={() => submitVerify(current.email)} />
        <LinkRow>
          <TextLink
            testID="account-resend"
            label={wait > 0 ? t.resendIn(wait) : t.resend}
            disabled={pending || wait > 0}
            onPress={() => resend(current.email, current.via)}
          />
          <TextLink label={current.via === "signIn" ? t.backToSignIn : t.back} onPress={() => go({ kind: current.via === "signUp" ? "signUp" : current.via === "code" ? "code" : "signIn" })} muted />
        </LinkRow>
      </>
    );
  } else if (step.kind === "twoFactor") {
    const current = step;
    body = (
      <>
        <TactileField
          testID="account-second-factor"
          label={t.secondFactorLabel}
          value={code}
          onChangeText={(value) => {
            setCode(secondFactorCode(value));
            setFieldErrors({});
          }}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.code}
          hint={t.twoFactorRecovery}
          onSubmitEditing={() => submitTwoFactor(current.ticket)}
          returnKeyType="go"
        />
        <Primary testID="account-submit" label={pending ? t.opening : t.twoFactorAction} disabled={pending} onPress={() => submitTwoFactor(current.ticket)} />
        <LinkRow>
          <TextLink label={t.backToSignIn} onPress={() => go({ kind: "signIn" })} muted />
        </LinkRow>
      </>
    );
  } else if (step.kind === "forgot") {
    body = (
      <>
        {emailField}
        <Primary testID="account-submit" label={pending ? t.sending : t.resetSendAction} disabled={pending} onPress={submitForgot} />
        <LinkRow>
          <TextLink label={t.backToSignIn} onPress={() => go({ kind: "signIn" })} muted />
        </LinkRow>
      </>
    );
  } else {
    const current = step;
    body = (
      <>
        {codeField(() => submitReset(current.email))}
        <TactileField
          testID="account-new-password"
          label={t.newPasswordLabel}
          kind="password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFieldErrors((errors) => ({ ...errors, password: undefined }));
          }}
          placeholder={t.passwordPlaceholder}
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.password}
          hint={strengthText}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          onSubmitEditing={() => submitReset(current.email)}
        />
        <Primary testID="account-submit" label={pending ? t.saving : t.resetSaveAction} disabled={pending} onPress={() => submitReset(current.email)} />
        <LinkRow>
          <TextLink label={wait > 0 ? t.resendIn(wait) : t.resend} disabled={pending || wait > 0} onPress={() => {
            void run(async () => {
              await requestPasswordReset(current.email);
              markSent();
            });
          }} />
          <TextLink label={t.backToSignIn} onPress={() => go({ kind: "signIn" })} muted />
        </LinkRow>
      </>
    );
  }

  const showTabs = step.kind === "signIn" || step.kind === "signUp" || step.kind === "code";
  const waitingMail = step.kind === "verify" || step.kind === "reset" || (step.kind === "twoFactor" && step.methods.includes("email"));

  const card = (
    <View
      testID="account-card"
      style={{
        width: "100%",
        maxWidth: 480,
        backgroundColor: tactile.surface,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: tactile.border,
        boxShadow: ledge(tactile.border, 6),
        padding: width < 420 ? 20 : 28,
        gap: 18,
      } as object}
    >
      {showTabs ? (
        <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 16, backgroundColor: tactile.raised }}>
          <Tab testID="account-tab-signin" label={t.tabSignIn} active={step.kind !== "signUp"} onPress={() => go({ kind: "signIn" })} />
          <Tab testID="account-tab-signup" label={t.tabSignUp} active={step.kind === "signUp"} onPress={() => go({ kind: "signUp" })} />
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: tactile.font, fontSize: 26, lineHeight: 32, fontWeight: "800", color: tactile.ink, letterSpacing: -0.4 }}>
          {heading.title}
        </Text>
        <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.muted }}>{heading.dek}</Text>
      </View>

      {notice ? (
        <Banner tone="success" testID="account-notice">
          {notice === "codeSent" ? t.codeSent : t.passwordSaved}
        </Banner>
      ) : null}
      {error ? (
        <Banner tone="error" testID="account-error">
          {error}
        </Banner>
      ) : null}

      {body}

      {waitingMail && inboxUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(inboxUrl)}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingVertical: 6, cursor: "pointer" } as object}
        >
          <TactileIcon name="mail" size={16} color={tactile.muted} />
          <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.muted, textDecorationLine: "underline" }}>{t.openInbox}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const hero = (
    <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : "100%", maxWidth: 520, gap: 18 }}>
      <View style={{ flexDirection: "row" }}>
        {CAST.map((who, index) => (
          <Image
            key={who}
            source={{ uri: `/cast/${who}.png` }}
            accessibilityIgnoresInvertColors
            style={{
              width: wide ? 64 : 48,
              height: wide ? 64 : 48,
              borderRadius: 999,
              borderWidth: 3,
              borderColor: tactile.surface,
              backgroundColor: tactile.raised,
              marginLeft: index === 0 ? 0 : -12,
            }}
          />
        ))}
      </View>
      <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: tactile.primaryInk }}>{t.kicker}</Text>
      <Text style={{ fontFamily: tactile.serif, fontSize: wide ? 40 : 28, lineHeight: wide ? 46 : 34, fontWeight: "600", color: tactile.ink }}>{t.heroTitle}</Text>
      <Text style={{ fontFamily: tactile.font, fontSize: 16, lineHeight: 24, color: tactile.body }}>{t.heroDek}</Text>
      {wide ? (
        <View style={{ gap: 12, marginTop: 4 }}>
          {[t.heroPoint1, t.heroPoint2, t.heroPoint3].map((point) => (
            <View key={point} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <View style={{ marginTop: 2, width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: tactile.primarySoft }}>
                <TactileIcon name="check" size={14} color={tactile.primary} strokeWidth={3} />
              </View>
              <Text style={{ flex: 1, fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body }}>{point}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View testID="account-screen" style={{ flex: 1, backgroundColor: tactile.bg, minHeight: "100%" } as object}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: tactile.border, backgroundColor: tactile.surface }}>
        <TactileLogo size={34} />
        <LocaleMenu label={t.uiLanguage} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 1120,
            marginHorizontal: "auto",
            paddingHorizontal: width < 420 ? 16 : 24,
            paddingVertical: wide ? 56 : 28,
            flexDirection: wide ? "row" : "column",
            alignItems: wide ? "center" : "stretch",
            justifyContent: "center",
            gap: wide ? 56 : 24,
          } as object}
        >
          {hero}
          <View style={{ alignItems: "center", width: wide ? undefined : "100%" }}>{card}</View>
        </View>
      </ScrollView>
    </View>
  );
}

function headingFor(step: Step, t: AccountCopy): { title: string; dek: string } {
  switch (step.kind) {
    case "signUp":
      return { title: t.signUpTitle, dek: t.signUpDek };
    case "code":
      return { title: t.codeTitle, dek: t.codeDek };
    case "verify":
      return { title: t.verifyTitle, dek: t.verifyDek(step.email) };
    case "twoFactor":
      return {
        title: t.twoFactorTitle,
        dek: step.methods.includes("totp") && step.methods.includes("email") ? t.twoFactorBoth : step.methods.includes("email") ? t.twoFactorEmail : t.twoFactorTotp,
      };
    case "forgot":
      return { title: t.forgotTitle, dek: t.forgotDek };
    case "reset":
      return { title: t.resetTitle, dek: t.resetDek(step.email) };
    default:
      return { title: t.signInTitle, dek: t.signInDek };
  }
}

function Primary({ label, onPress, disabled, testID }: { label: string; onPress: () => void; disabled: boolean; testID: string }) {
  return (
    <View testID={testID}>
      <TactileButton label={label} onPress={onPress} disabled={disabled} size="lg" fullWidth />
    </View>
  );
}

function Tab({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: active ? tactile.surface : "transparent",
        boxShadow: active ? `0 3px 0 ${tactile.borderStrong}` : "none",
        cursor: "pointer",
      } as object}
    >
      <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: active ? tactile.primaryInk : tactile.muted }}>{label}</Text>
    </Pressable>
  );
}

function LinkRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>{children}</View>;
}

function TextLink({ label, onPress, muted = false, disabled = false, testID }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={{ paddingVertical: 8, cursor: disabled ? "default" : "pointer" } as object}
    >
      <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "700", color: disabled ? tactile.faint : muted ? tactile.muted : tactile.primaryInk }}>{label}</Text>
    </Pressable>
  );
}

function Banner({ tone, children, testID }: { tone: "error" | "success"; children: ReactNode; testID: string }) {
  const error = tone === "error";
  return (
    <View
      testID={testID}
      accessibilityRole={error ? "alert" : "text"}
      accessibilityLiveRegion={error ? "assertive" : "polite"}
      style={{
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: error ? "#FECACA" : "#A7F3D0",
        backgroundColor: error ? tactile.dangerSoft : tactile.successSoft,
      }}
    >
      <TactileIcon name={error ? "alert" : "check"} size={18} color={error ? tactile.danger : tactile.success} />
      <Text style={{ flex: 1, fontFamily: tactile.font, fontSize: 14, lineHeight: 20, fontWeight: "600", color: error ? tactile.danger : tactile.success }}>{children}</Text>
    </View>
  );
}
