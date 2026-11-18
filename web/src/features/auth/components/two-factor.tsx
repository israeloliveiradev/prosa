import { View } from "react-native";
import { OtpField } from "@/ui/otp-field";
import { Button } from "@/ui/button";
import { Segmented } from "@/ui/segmented";
import { Text } from "@/ui/text";
import { TextAction } from "@/ui/text-action";
import { InlineError } from "@/ui/inline-error";
import { useCopy } from "@/lib/i18n";

export interface TwoFactorProps {
  otp: string;
  onChangeOtp: (code: string) => void;
  methods: Array<"totp" | "email">;
  selectedMethod: "totp" | "email";
  onChangeMethod: (method: "totp" | "email") => void;
  onSubmit: () => void;
  onBack: () => void;
  pending: boolean;
  error: string | null;
}

export function TwoFactor({
  otp,
  onChangeOtp,
  methods,
  selectedMethod,
  onChangeMethod,
  onSubmit,
  onBack,
  pending,
  error,
}: TwoFactorProps) {
  const copy = useCopy();

  const methodOptions = methods.map((m) => ({
    value: m,
    label: m === "totp" ? "Aplicativo autenticador" : "Código por e-mail",
  }));

  return (
    <View style={{ gap: 20 }}>
      <Text variant="body" tone="muted">
        {selectedMethod === "totp"
          ? "Abra seu aplicativo autenticador (Google Authenticator, 1Password, etc.) e digite o código de 6 dígitos."
          : "Enviamos um código de segurança de 6 dígitos para o seu e-mail cadastrado."}
      </Text>

      {methods.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Text variant="label">Método de verificação</Text>
          <Segmented
            options={methodOptions}
            value={selectedMethod}
            onChange={(val) => onChangeMethod(val as "totp" | "email")}
          />
        </View>
      ) : null}

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
        label={copy.finishLogin ?? "Concluir entrada"}
        variant="primary"
        size="lg"
        loading={pending}
        disabled={pending || otp.length !== 6}
        onPress={onSubmit}
        testID="account-submit"
        fullWidth
      />

      <View style={{ alignItems: "center" }}>
        <TextAction
          label="Voltar para login"
          onPress={onBack}
        />
      </View>
    </View>
  );
}
