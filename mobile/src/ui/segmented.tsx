import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";
import { useHaptics } from "./hooks/use-haptics";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string = string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  label?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  label,
  testID,
  style,
  className,
}: SegmentedProps<T>) {
  const { palette } = useTheme();
  const { trigger } = useHaptics();

  const handleSelect = (next: T) => {
    if (next !== value) {
      trigger("selection");
      onChange(next);
    }
  };

  return (
    <View style={style} className={`gap-1.5 ${className ?? ""}`}>
      {label && (
        <Text variant="small" tone="muted" weight="500">
          {label}
        </Text>
      )}

      <View
        testID={testID}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{
          height: 36,
          backgroundColor: palette.raised,
          borderRadius: radius.control,
          padding: 3,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: palette.borderSoft,
        }}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              testID={testID ? `${testID}-option-${opt.value}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, selected }}
              aria-checked={selected}
              accessibilityLabel={opt.label}
              onPress={() => handleSelect(opt.value)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: radius.control - 1,
                backgroundColor: selected ? palette.sheet : "transparent",
                borderWidth: selected ? 1 : 0,
                borderColor: selected ? palette.border : "transparent",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Text
                variant="small"
                tone={selected ? "ink" : "muted"}
                weight={selected ? "500" : "400"}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
