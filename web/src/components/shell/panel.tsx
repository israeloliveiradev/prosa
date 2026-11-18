import type { ReactNode } from "react";
import { View, type TextInputProps } from "react-native";
import { Card, Field as UiField, Text } from "@/ui";
import { normalizeOtp } from "@/lib/otp";
import { keepWords } from "@/lib/text";

export function Panel({ children }: { children: ReactNode }) {
  return <Card style={{ paddingHorizontal: 24, paddingVertical: 28 }}>{children}</Card>;
}

export function PanelHead({ kicker: _kicker, title, dek }: { kicker?: string; title: string; dek?: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text variant="heading-lg" color="primary">
        {keepWords(title)}
      </Text>
      {dek ? (
        <Text variant="body-md" color="secondary" style={{ marginTop: 8 }}>
          {keepWords(dek)}
        </Text>
      ) : null}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text variant="caption" weight="medium" color="secondary" style={{ marginBottom: 8 }}>
        {keepWords(label)}
      </Text>
      {children}
    </View>
  );
}

export function SoftInput({
  value,
  onChangeText,
  label,
  secure,
  email,
  code,
  placeholder,
  autoComplete,
  textContentType,
  nativeID,
  invalid,
  describedBy,
  testID,
}: {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  secure?: boolean;
  email?: boolean;
  code?: boolean;
  placeholder?: string;
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  nativeID?: string;
  invalid?: boolean;
  describedBy?: string;
  testID?: string;
}) {
  const kind = secure ? "password" : email ? "email" : code ? "number" : "text";

  return (
    <UiField
      label={label}
      value={value}
      onChangeText={code ? (next) => onChangeText(normalizeOtp(next)) : onChangeText}
      kind={kind}
      placeholder={placeholder}
      autoComplete={autoComplete}
      textContentType={textContentType}
      nativeID={nativeID}
      error={invalid ? "Campo inválido" : undefined}
      testID={testID}
      aria-describedby={describedBy}
    />
  );
}
