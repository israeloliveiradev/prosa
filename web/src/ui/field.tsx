import { useState, useId, forwardRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";
import { Icon } from "./icon";
import { usePointer } from "./hooks/use-pointer";

export type FieldKind = "text" | "email" | "password" | "number" | "search" | "multiline";

export interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  error?: string | null;
  kind?: FieldKind;
  disabled?: boolean;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
    label,
    hint,
    error,
    kind = "text",
    disabled = false,
    value,
    onChangeText,
    placeholder,
    autoCapitalize,
    autoCorrect,
    autoComplete,
    textContentType,
    maxLength,
    testID,
    containerStyle,
    className,
    ...rest
  },
  ref
) {
  const { palette } = useTheme();
  const pointer = usePointer();
  const generatedId = useId();

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputId = `${generatedId}-input`;
  const labelId = `${generatedId}-label`;
  const errorId = `${generatedId}-error`;
  const hintId = `${generatedId}-hint`;

  const isPassword = kind === "password";
  const isMultiline = kind === "multiline";
  const height = isMultiline ? undefined : pointer === "fine" ? 40 : 48;
  const minHeight = isMultiline ? 96 : undefined;

  let borderColor = palette.controlStrong;
  if (error) {
    borderColor = palette.negative;
  } else if (isFocused) {
    borderColor = palette.accent;
  }

  const borderWidth = isFocused || error ? 1.5 : 1;

  // Keyboard and inputMode
  let keyboardType = rest.keyboardType;
  let inputMode = rest.inputMode;
  if (kind === "email") {
    keyboardType = "email-address";
    inputMode = "email";
    autoCapitalize = autoCapitalize ?? "none";
    autoCorrect = autoCorrect ?? false;
  } else if (kind === "number") {
    keyboardType = "numeric";
    inputMode = "numeric";
  } else if (kind === "search") {
    inputMode = "search";
  }

  const ariaDescribedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <View style={containerStyle} className={`gap-1.5 ${className ?? ""}`}>
      <Text
        nativeID={labelId}
        testID={testID ? `${testID}-label` : undefined}
        variant="label"
        tone={error ? "negative" : "ink"}
        weight="500"
      >
        {label}
      </Text>

      <View
        style={{
          minHeight: height ?? minHeight,
          backgroundColor: disabled ? palette.raised : palette.sheet,
          borderColor,
          borderWidth,
          borderRadius: radius.control,
          paddingHorizontal: 12,
          paddingVertical: isMultiline ? 10 : 0,
          flexDirection: "row",
          alignItems: isMultiline ? "flex-start" : "center",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <TextInput
          ref={ref}
          nativeID={inputId}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.faint}
          editable={!disabled}
          multiline={isMultiline}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          maxLength={maxLength}
          keyboardType={keyboardType}
          inputMode={inputMode}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label}
          aria-labelledby={labelId}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          style={{
            flex: 1,
            color: palette.ink,
            fontFamily: "IBM Plex Sans",
            fontSize: 16,
            lineHeight: 24,
            padding: 0,
            margin: 0,
            textAlignVertical: isMultiline ? "top" : "center",
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
          }}
          {...rest}
        />

        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ocultar senha" : "Ver senha"}
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}
            className="ml-2 cursor-pointer p-1"
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={20} tone="muted" />
          </Pressable>
        )}
      </View>

      {error ? (
        <Text
          nativeID={errorId}
          testID={testID ? `${testID}-error` : undefined}
          variant="small"
          tone="negative"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          nativeID={hintId}
          testID={testID ? `${testID}-hint` : undefined}
          variant="small"
          tone="faint"
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
