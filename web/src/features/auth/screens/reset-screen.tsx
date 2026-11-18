import { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { PublicShell } from "@/features/shell/public-shell";
import { Field } from "@/ui/field";
import { OtpField } from "@/ui/otp-field";
import { Button } from "@/ui/button";
import { Text } from "@/ui/text";
import { TextAction } from "@/ui/text-action";
import { Progress } from "@/ui/progress";
import { InlineError } from "@/ui/inline-error";
import { toast } from "@/ui/toast";
import { toUserMessage } from "@/api/errors";
import { useFocusOnError } from "@/ui/hooks/use-focus-on-error";
import { useCopy } from "@/lib/i18n";
import { confirmPasswordReset, fetchMailInbox, requestPasswordReset } from "@/lib/api";
import { normalizeOtp } from "@/lib/otp";
import { passwordStrength } from "@/lib/prefs";
import { tap } from "@/lib/haptics";

export function ResetScreen() {
  const copy = useCopy();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [inboxUrl, setInboxUrl] = useState<string | null>(null);
  const errorRef = useRef<View>(null);

  useFocusOnError(error, errorRef);

  useEffect(() => {
    void fetchMailInbox().then((url) => {
      if (url) setInboxUrl(url);
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const strength = password ? passwordStrength(password) : null;
  const strengthScore = strength === "strong" ? 100 : strength === "ok" ? 66 : strength === "weak" ? 33 : 0;
  const strengthTextTone = strength === "strong" ? "positive" : strength === "ok" ? "muted" : "negative";

  const handleSave = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError(copy.checkEmailPassword ?? "Digite um e-mail válido.");
      return;
    }
    const code = normalizeOtp(otp);
    if (code.length !== 6) {
      setError(copy.pasteSixDigits ?? "Digite os 6 dígitos do código de recuperação.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    void tap("medium");
    setPending(true);
    setError(null);

    try {
      await confirmPasswordReset(email, code, password);
      toast.show({
        message: copy.saved ?? "Senha redefinida com sucesso!",
        tone: "positive",
      });
      router.replace("/account" as Href);
    } catch (caught) {
      setError(toUserMessage(caught, copy as any));
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    if (!email.includes("@")) return;

    void tap("light");
    setPending(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setCooldown(30);
      toast.show({
        message: copy.forgotHint ?? "Código enviado para o seu e-mail.",
        tone: "info",
      });
    } catch (caught) {
      setError(toUserMessage(caught, copy as any));
    } finally {
      setPending(false);
    }
  };

  return (
    <PublicShell>
      <View style={{ marginBottom: 20, gap: 4 }}>
        <Text variant="title" weight="semibold" tone="ink" accessibilityRole="header">
          {copy.resetTitle ?? "Redefinir senha"}
        </Text>
        <Text variant="body" tone="muted">
          {copy.forgotHint ?? "Digite o código recebido no seu e-mail e escolha uma nova senha."}
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Field
          label={copy.emailLabel ?? "E-mail"}
          placeholder={copy.emailExample ?? "ana@exemplo.com"}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="reset-email"
        />

        <View style={{ gap: 6, alignItems: "center" }}>
          <Text variant="label" style={{ alignSelf: "flex-start" }}>
            {copy.resetCode ?? "Código de 6 dígitos"}
          </Text>
          <OtpField
            length={6}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              setError(null);
            }}
            disabled={pending}
            testID="reset-otp"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Field
            label={copy.newPassword ?? "Nova senha"}
            placeholder="No mínimo 8 caracteres"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setError(null);
            }}
            secureTextEntry
            testID="reset-password"
          />
          {password ? (
            <View style={{ gap: 4, marginTop: 2 }}>
              <Progress value={strengthScore} tone={strength === "strong" ? "ink" : "accent"} />
              <Text variant="caption" tone={strengthTextTone}>
                {strength === "strong"
                  ? "Senha forte"
                  : strength === "ok"
                  ? "Senha razoável"
                  : "Senha fraca (mínimo 8 caracteres com letras e números)"}
              </Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <InlineError message={error} testID="reset-error" />
        ) : null}

        <Button
          label={copy.resetSave ?? "Salvar nova senha"}
          variant="primary"
          size="lg"
          loading={pending}
          disabled={pending || !email.includes("@") || otp.length !== 6 || password.length < 8}
          onPress={() => void handleSave()}
          testID="reset-submit"
          fullWidth
        />

        <View style={{ alignItems: "center", gap: 12, marginTop: 4 }}>
          {cooldown > 0 ? (
            <Text variant="caption" tone="muted">
              Reenviar código em {cooldown}s
            </Text>
          ) : (
            <TextAction
              label={copy.verifyAgain ?? "Reenviar código"}
              onPress={() => void handleResend()}
              testID="reset-resend"
            />
          )}

          {inboxUrl ? (
            <TextAction
              label="Abrir caixa de correio (Mailpit)"
              onPress={() => void Linking.openURL(inboxUrl)}
              testID="reset-mailpit"
            />
          ) : null}

          <TextAction
            label={copy.backToSignIn ?? "Voltar para entrar"}
            onPress={() => router.replace("/account" as Href)}
            testID="reset-back"
          />
        </View>
      </View>
    </PublicShell>
  );
}
