import { View } from "react-native";
import { Field } from "@/ui/field";
import { Button } from "@/ui/button";
import { TextAction } from "@/ui/text-action";
import { Text } from "@/ui/text";
import { InlineError } from "@/ui/inline-error";
import { useCopy } from "@/lib/i18n";

export interface ForgotFormProps {
  email: string;
  onChangeEmail: (value: string) => void;
  onSubmit: () => void;
  onBackToSignIn: () => void;
  pending: boolean;
  error: string | null;
}

export function ForgotForm({
  email,
  onChangeEmail,
  onSubmit,
  onBackToSignIn,
  pending,
  error,
}: ForgotFormProps) {
  const copy = useCopy();

  return (
    <View style={{ gap: 16 }}>
      <Text variant="body" tone="muted">
        Digite o e-mail da sua conta para enviarmos o código de recuperação de senha.
      </Text>

      <Field
        label={copy.emailLabel ?? "E-mail"}
        placeholder={copy.emailExample ?? "ana@exemplo.com"}
        value={email}
        onChangeText={onChangeEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        testID="account-email"
      />

      {error ? (
        <InlineError message={error} testID="account-error" />
      ) : null}

      <Button
        label="Enviar código"
        variant="primary"
        size="lg"
        loading={pending}
        disabled={pending || !email.includes("@")}
        onPress={onSubmit}
        testID="account-submit"
        fullWidth
      />

      <View style={{ alignItems: "center" }}>
        <TextAction
          label={copy.backToSignIn ?? "Voltar para entrar"}
          onPress={onBackToSignIn}
        />
      </View>
    </View>
  );
}
