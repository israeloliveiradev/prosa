import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { Text } from "./text";
import { Icon } from "./icon";
import { useHaptics } from "./hooks/use-haptics";

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  testID,
  style,
  className,
}: CheckboxProps) {
  const { palette } = useTheme();
  const { trigger } = useHaptics();

  const handleToggle = () => {
    if (disabled) return;
    trigger("selection");
    onChange(!checked);
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={handleToggle}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: disabled ? 0.5 : 1,
          paddingVertical: 6,
        },
        style,
      ]}
      className={className}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: checked ? palette.primary : palette.controlStrong,
          backgroundColor: checked ? palette.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Icon name="check" size={14} color={palette.onPrimary} strokeWidth={2} />}
      </View>

      <Text variant="body" tone="ink">
        {label}
      </Text>
    </Pressable>
  );
}
