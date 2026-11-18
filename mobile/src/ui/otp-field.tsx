import { useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";

export interface OtpFieldProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function normalizeOtp(raw: string, length = 6): string {
  return raw.replace(/\D/g, "").slice(0, length);
}

export function OtpField({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  label = "Código de confirmação",
  testID,
  style,
  className,
}: OtpFieldProps) {
  const { palette } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const cleanVal = normalizeOtp(value, length);

  const handleChangeText = (text: string) => {
    const next = normalizeOtp(text, length);
    onChange(next);
    if (next.length === length && onComplete) {
      onComplete(next);
    }
  };

  const handleBoxPress = () => {
    inputRef.current?.focus();
  };

  const digits = Array.from({ length }, (_, i) => cleanVal[i] || "");

  return (
    <View style={style} className={`gap-2 ${className ?? ""}`}>
      {label && (
        <Text
          testID={testID ? `${testID}-label` : undefined}
          variant="label"
          tone={error ? "negative" : "ink"}
          weight="500"
        >
          {label}
        </Text>
      )}

      <Pressable
        onPress={handleBoxPress}
        disabled={disabled}
        accessibilityRole="none"
        className="flex-row items-center gap-2"
      >
        {digits.map((digit, i) => {
          const isCurrent = isFocused && (cleanVal.length === i || (cleanVal.length === length && i === length - 1));
          const hasValue = digit.length > 0;

          let borderColor = palette.controlStrong;
          if (error) {
            borderColor = palette.negative;
          } else if (isCurrent) {
            borderColor = palette.accent;
          } else if (hasValue) {
            borderColor = palette.border;
          }

          return (
            <View
              key={i}
              testID={testID ? `${testID}-digit-${i}` : undefined}
              style={{
                width: 44,
                height: 52,
                borderRadius: radius.control,
                backgroundColor: palette.sheet,
                borderWidth: isCurrent || error ? 1.5 : 1,
                borderColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text variant="kpi" numeric tone={digit ? "ink" : "faint"}>
                {digit || ""}
              </Text>
            </View>
          );
        })}

        {/* Hidden TextInput for native keyboard, autofill, and paste handling */}
        <TextInput
          ref={inputRef}
          testID={testID ? `${testID}-input` : undefined}
          value={cleanVal}
          onChangeText={handleChangeText}
          maxLength={length}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0.01,
          }}
        />
      </Pressable>

      {error && (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          variant="small"
          tone="negative"
        >
          {error}
        </Text>
      )}
    </View>
  );
}
