import { forwardRef, useId, useState } from "react";
import { Platform, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";

export interface TactileFieldProps extends Omit<TextInputProps, "style" | "secureTextEntry"> {
  label: string;
  hint?: string | null;
  error?: string | null;
  /** "password" mostra o botão de ver/ocultar; "code" usa dígitos grandes espaçados. */
  kind?: "text" | "email" | "password" | "code";
  showLabel?: string;
  hideLabel?: string;
  testID?: string;
}

/** Campo do visual tátil: borda firme, foco em verde, erro em vermelho ligado por aria-describedby. */
export const TactileField = forwardRef<TextInput, TactileFieldProps>(function TactileField(
  { label, hint, error, kind = "text", showLabel, hideLabel, testID, onFocus, onBlur, ...rest },
  ref,
) {
  const id = useId().replace(/:/g, "");
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const isCode = kind === "code";

  return (
    <View style={{ gap: 6 }}>
      <Text nativeID={`${id}-label`} style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: error ? tactile.danger : tactile.ink }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: isCode ? 58 : 50,
          paddingHorizontal: 14,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: error ? tactile.danger : focused ? tactile.primary : tactile.borderStrong,
          backgroundColor: tactile.surface,
          boxShadow: `inset 0 2px 0 ${tactile.raised}`,
        } as object}
      >
        <TextInput
          ref={ref}
          testID={testID}
          nativeID={`${id}-input`}
          accessibilityLabel={label}
          aria-labelledby={`${id}-label`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          placeholderTextColor={tactile.faint}
          secureTextEntry={kind === "password" && !visible}
          autoCapitalize={kind === "email" || kind === "password" || isCode ? "none" : rest.autoCapitalize}
          autoCorrect={kind === "text" ? rest.autoCorrect : false}
          keyboardType={kind === "email" ? "email-address" : isCode ? "number-pad" : rest.keyboardType}
          inputMode={kind === "email" ? "email" : isCode ? "numeric" : rest.inputMode}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            paddingVertical: 12,
            color: tactile.ink,
            fontFamily: tactile.font,
            fontSize: isCode ? 24 : 16,
            fontWeight: isCode ? "800" : "600",
            letterSpacing: isCode ? 8 : 0,
            textAlign: isCode ? "center" : "left",
            ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
          } as object}
          {...rest}
        />
        {kind === "password" && showLabel && hideLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? hideLabel : showLabel}
            onPress={() => setVisible((value) => !value)}
            hitSlop={8}
            style={{ padding: 4, marginLeft: 6, cursor: "pointer" } as object}
          >
            <TactileIcon name={visible ? "eyeOff" : "eye"} size={20} color={tactile.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text nativeID={`${id}-error`} accessibilityLiveRegion="polite" style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "600", color: tactile.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text nativeID={`${id}-hint`} style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.muted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
