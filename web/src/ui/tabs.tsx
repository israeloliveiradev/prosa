import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { Text } from "./text";
import { useHaptics } from "./hooks/use-haptics";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string = string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (val: T) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  value,
  onChange,
  testID,
  style,
  className,
}: TabsProps<T>) {
  const { palette } = useTheme();
  const { trigger } = useHaptics();

  const handleSelect = (next: T) => {
    if (next !== value) {
      trigger("selection");
      onChange(next);
    }
  };

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[
        {
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        },
        style,
      ]}
      className={className}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: 16 }}
      >
        {tabs.map((tab) => {
          const selected = tab.id === value;
          return (
            <Pressable
              key={tab.id}
              testID={testID ? `${testID}-tab-${tab.id}` : undefined}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
              onPress={() => handleSelect(tab.id)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 4,
                borderBottomWidth: 2,
                borderBottomColor: selected ? palette.ink : "transparent",
                marginBottom: -1,
                cursor: "pointer",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text
                variant="label"
                tone={selected ? "ink" : "muted"}
                weight={selected ? "500" : "400"}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View
                  style={{
                    backgroundColor: selected ? palette.raised : palette.raised,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text variant="small" numeric tone={selected ? "ink" : "muted"}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
