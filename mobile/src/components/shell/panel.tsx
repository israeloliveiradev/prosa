import type { ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
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
}: {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  secure?: boolean;
  email?: boolean;
  code?: boolean;
  placeholder?: string;
}) {
  const { palette } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      accessibilityLabel={label}
      placeholder={placeholder}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={code ? "number-pad" : email ? "email-address" : "default"}
      placeholderTextColor={palette.onSurfaceVariant}
      className={`min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink ${code ? "text-center font-label tracking-[0.4em]" : ""}`}
    />
  );
}
