import { View } from "react-native";
import { Field } from "@/ui/field";
import { Button } from "@/ui/button";
import { InlineError } from "@/ui/inline-error";
import { Text } from "@/ui/text";
import { useCopy } from "@/lib/i18n";

export interface SignInFormProps {
  email: string;
  onChangeEmail: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}

export function SignInForm({
  email,
  onChangeEmail,
  onSubmit,
  pending,
  error,
}: SignInFormProps) {
  const copy = useCopy();

  return (
    <View style={{ gap: 20 }}>
      <Field
        label={copy.emailLabel ?? "E-mail"}
        placeholder={copy.emailExample ?? "seu.email@exemplo.com"}
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
        label="Enviar código de acesso"
        variant="primary"
        size="lg"
        loading={pending}
        disabled={pending || !email.trim()}
        onPress={onSubmit}
        testID="account-submit"
        fullWidth
      />

      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <Text variant="caption" tone="faint" style={{ textAlign: "center", lineHeight: 18 }}>
          Acesso sem senha: você receberá um código de 6 dígitos no seu e-mail para validar sua conta com segurança.
        </Text>
      </View>
    </View>
  );
}
