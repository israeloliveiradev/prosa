import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { Text } from "./text";
import { useHaptics } from "./hooks/use-haptics";

export interface RadioOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface RadioGroupProps<T extends string = string> {
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (val: T) => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function RadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  testID,
  style,
  className,
}: RadioGroupProps<T>) {
  const { palette } = useTheme();
  const { trigger } = useHaptics();

  const handleSelect = (val: T) => {
    if (disabled || val === value) return;
    trigger("selection");
    onChange(val);
  };

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={style}
      className={`gap-3 ${className ?? ""}`}
    >
      {label && (
        <Text variant="label" tone="muted" weight="500">
          {label}
        </Text>
      )}

      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            testID={testID ? `${testID}-radio-${opt.value}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            aria-checked={selected}
            accessibilityLabel={opt.label}
            disabled={disabled}
            onPress={() => handleSelect(opt.value)}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              opacity: disabled ? 0.5 : 1,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: selected ? palette.primary : palette.controlStrong,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {selected && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: palette.primary,
                  }}
                />
              )}
            </View>

            <View className="flex-1">
              <Text variant="body" tone="ink">
                {opt.label}
              </Text>
              {opt.description && (
                <Text variant="small" tone="muted" className="mt-0.5">
                  {opt.description}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
