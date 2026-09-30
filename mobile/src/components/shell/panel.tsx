import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Icon } from "@/components/shell/icon";
import { useCopy } from "@/lib/i18n";
import { normalizeOtp } from "@/lib/otp";
import { keepWords } from "@/lib/text";
import { useTheme } from "@/theme/ThemeContext";

export function Panel({ children }: { children: ReactNode }) {
  return <View className="rounded-[28px] border border-line bg-card px-6 py-7">{children}</View>;
}

export function PanelHead({ kicker, title, dek }: { kicker?: string; title: string; dek?: string }) {
  return (
    <View className="mb-6">
      {kicker ? <Text className="font-label text-[11px] uppercase tracking-[0.22em] text-ember">{keepWords(kicker)}</Text> : null}
      <Text className="font-displayItalic mt-2 text-headline text-ink">{keepWords(title)}</Text>
      {dek ? <Text className="mt-3 text-base leading-7 text-muted">{keepWords(dek)}</Text> : null}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 font-label text-sm text-muted">{keepWords(label)}</Text>
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
}) {
  const { palette } = useTheme();
  const copy = useCopy();
  const [revealed, setRevealed] = useState(false);
  const complete = autoComplete ?? (code ? "one-time-code" : email ? "email" : secure ? "new-password" : undefined);
  const content = textContentType ?? (code ? "oneTimeCode" : email ? "emailAddress" : secure ? "newPassword" : undefined);
  const field = (
    <TextInput
      value={value}
      onChangeText={code ? (next) => onChangeText(normalizeOtp(next)) : onChangeText}
      nativeID={nativeID}
      accessibilityLabel={label}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      placeholder={placeholder}
      secureTextEntry={Boolean(secure) && !revealed}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={complete}
      textContentType={content}
      keyboardType={code ? "number-pad" : email ? "email-address" : "default"}
      placeholderTextColor={palette.onSurfaceVariant}
      className={`min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink ${secure ? "pr-14" : ""} ${code ? "text-center font-label tracking-[0.4em]" : ""}`}
    />
  );
  if (!secure) {
    return field;
  }
  return (
    <View className="relative">
      {field}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? copy.hidePassword : copy.showPassword}
        accessibilityState={{ selected: revealed }}
        onPress={() => setRevealed((open) => !open)}
        className="absolute bottom-0 right-0 top-0 z-10 min-w-12 cursor-pointer items-center justify-center"
      >
        <Icon name={revealed ? "eyeOff" : "eye"} color={palette.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}
