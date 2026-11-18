import { useState, type ReactNode } from "react";
import { Pressable, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Text, type TextTone } from "./text";

export interface TextActionProps {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  tone?: "ink" | "muted" | "negative" | "accent";
  role?: "button" | "link";
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

export function TextAction({
  label,
  children,
  onPress,
  tone = "ink",
  role = "button",
  disabled = false,
  testID,
  style,
  textStyle,
  className,
}: TextActionProps) {
  const [isHovered, setIsHovered] = useState(false);

  const textTone: TextTone = tone === "negative"
    ? "negative"
    : tone === "accent"
    ? "accent"
    : tone === "muted"
    ? (isHovered ? "ink" : "muted")
    : "ink";

  const content = label ?? children;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={!disabled ? onPress : undefined}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        {
          opacity: disabled ? 0.45 : 1,
          alignSelf: "flex-start",
        },
        style,
      ]}
      className={`py-1 ${className ?? ""}`}
    >
      <Text
        variant="label"
        tone={textTone}
        weight="500"
        style={[
          {
            textDecorationLine: isHovered ? "underline" : "none",
          },
          textStyle,
        ]}
      >
        {content}
      </Text>
    </Pressable>
  );
}
