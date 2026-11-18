import { Linking, View } from "react-native";
import { OtpField } from "@/ui/otp-field";
import { Button } from "@/ui/button";
import { TextAction } from "@/ui/text-action";
import { Text } from "@/ui/text";
import { InlineError } from "@/ui/inline-error";
import { useCopy } from "@/lib/i18n";

export interface VerifyEmailProps {
  email: string;
  otp: string;
  onChangeOtp: (code: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
  cooldown: number;
  inboxUrl: string | null;
  pending: boolean;
  error: string | null;
}

export function VerifyEmail({
  email,
  otp,
  onChangeOtp,
  onSubmit,
  onResend,
  onBack,
  cooldown,
  inboxUrl,
  pending,
  error,
}: VerifyEmailProps) {
  const copy = useCopy();

  const handleOpenInbox = () => {
    if (inboxUrl) {
      void Linking.openURL(inboxUrl);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <OtpField
          length={6}
          value={otp}
          onChange={onChangeOtp}
          disabled={pending}
          testID="account-otp"
        />
      </View>

      {error ? (
        <InlineError message={error} testID="account-error" />
      ) : null}

      <Button
        label={copy.verifySave ?? "Confirmar"}
        variant="primary"
        size="lg"
        loading={pending}
        disabled={pending || otp.length !== 6}
        onPress={onSubmit}
        testID="account-submit"
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
            onPress={onResend}
            testID="account-resend"
          />
        )}

        {inboxUrl ? (
          <TextAction
            label="Abrir caixa de correio (Mailpit)"
            onPress={handleOpenInbox}
            testID="account-mailpit"
          />
        ) : null}

        <TextAction
          label="Trocar e-mail ou voltar"
          onPress={onBack}
        />
      </View>
    </View>
  );
}
