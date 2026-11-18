import { View } from "react-native";
import { Field } from "@/ui/field";
import { Button } from "@/ui/button";
import { Segmented } from "@/ui/segmented";
import { Text } from "@/ui/text";
import { InlineError } from "@/ui/inline-error";
import { Progress } from "@/ui/progress";
import { useCopy } from "@/lib/i18n";
import { passwordStrength } from "@/lib/prefs";
import type { AccountUser } from "@/api/schemas/auth";

export interface SignUpFormProps {
  email: string;
  onChangeEmail: (value: string) => void;
  password: string;
  onChangePassword: (value: string) => void;
  level: AccountUser["level"];
  onChangeLevel: (level: AccountUser["level"]) => void;
  onSubmit: () => void;
  onToggleSignIn: () => void;
  pending: boolean;
  error: string | null;
}

const LEVELS: Array<AccountUser["level"]> = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function SignUpForm({
  email,
  onChangeEmail,
  password,
  onChangePassword,
  level,
  onChangeLevel,
  onSubmit,
  onToggleSignIn,
  pending,
  error,
}: SignUpFormProps) {
  const copy = useCopy();
  const strength = password ? passwordStrength(password) : null;
  const strengthScore = strength === "strong" ? 100 : strength === "ok" ? 66 : strength === "weak" ? 33 : 0;
  const strengthTextTone = strength === "strong" ? "positive" : strength === "ok" ? "muted" : "negative";

  const levelOptions = LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <View style={{ gap: 16 }}>
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

      <View style={{ gap: 6 }}>
        <Field
          label={copy.passwordLabel ?? "Senha"}
          placeholder="No mínimo 8 caracteres"
          value={password}
          onChangeText={onChangePassword}
          secureTextEntry
          testID="account-password"
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

      <View style={{ gap: 6 }}>
        <Text variant="label">Nível inicial</Text>
        <Segmented
          options={levelOptions}
          value={level}
          onChange={(val) => onChangeLevel(val as AccountUser["level"])}
          testID="account-level"
        />
      </View>

      {error ? (
        <InlineError message={error} testID="account-error" />
      ) : null}

      <Button
        label={copy.createAccount ?? "Criar conta"}
        variant="primary"
        size="lg"
        loading={pending}
        disabled={pending}
        onPress={onSubmit}
        testID="account-submit"
        fullWidth
      />

      <Button
        label={copy.haveAccount ?? "Já tenho uma conta"}
        variant="ghost"
        size="md"
        onPress={onToggleSignIn}
        testID="account-toggle-mode"
        fullWidth
      />
    </View>
  );
}
