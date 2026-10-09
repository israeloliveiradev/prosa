import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Icon } from "@/components/shell/icon";
import { normalizeOtp } from "@/lib/otp";
import { useTheme } from "@/theme/ThemeContext";

export interface TextFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  helper?: string;
  error?: string;
  secure?: boolean;
  email?: boolean;
  code?: boolean;
  placeholder?: string;
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  nativeID?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

export function TextField({
  value,
  onChangeText,
  label,
  helper,
  error,
  secure,
  email,
  code,
  placeholder,
  autoComplete,
  textContentType,
  nativeID,
  invalid,
  describedBy,
  className = "",
}: TextFieldProps) {
  const { palette } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const complete =
    autoComplete ?? (code ? "one-time-code" : email ? "email" : secure ? "new-password" : undefined);
  const content =
    textContentType ?? (code ? "oneTimeCode" : email ? "emailAddress" : secure ? "newPassword" : undefined);

  const hasError = Boolean(error) || Boolean(invalid);

  let borderClass = "border-line";
  if (hasError) {
    borderClass = "border-danger";
  } else if (isFocused) {
    borderClass = "border-primary";
  }

  const inputComponent = (
    <TextInput
      value={value}
      onChangeText={code ? (next) => onChangeText(normalizeOtp(next)) : onChangeText}
      nativeID={nativeID}
      accessibilityLabel={label}
      aria-invalid={hasError}
      aria-describedby={describedBy}
      placeholder={placeholder}
      secureTextEntry={Boolean(secure) && !revealed}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={complete}
      textContentType={content}
      keyboardType={code ? "number-pad" : email ? "email-address" : "default"}
      placeholderTextColor={palette.onSurfaceVariant}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`min-h-[52px] rounded-2xl border-2 bg-paper px-4 text-base font-sans text-ink ${borderClass} ${
        secure ? "pr-14" : ""
      } ${code ? "text-center font-label tracking-[0.4em] text-xl" : ""} ${className}`}
    />
  );

  return (
    <View className="mb-4 w-full">
      {label ? <Text className="mb-1.5 font-label text-sm text-ink">{label}</Text> : null}

      {secure ? (
        <View className="relative">
          {inputComponent}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Ocultar senha" : "Exibir senha"}
            onPress={() => setRevealed((open) => !open)}
            className="absolute bottom-0 right-0 top-0 z-10 w-12 cursor-pointer items-center justify-center"
          >
            <Icon name={revealed ? "eyeOff" : "eye"} color={palette.onSurfaceVariant} size={20} />
          </Pressable>
        </View>
      ) : (
        inputComponent
      )}

      {error ? (
        <Text className="mt-1.5 font-label text-xs text-danger">{error}</Text>
      ) : helper ? (
        <Text className="mt-1 text-xs text-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
