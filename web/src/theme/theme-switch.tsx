import { Pressable, Text, View } from "react-native";
import { useTheme, type ThemePreference } from "@/theme/ThemeContext";

interface ThemeSwitchProps {
  tone?: "plain" | "inverse";
}

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

export function ThemeSwitch({ tone = "plain" }: ThemeSwitchProps) {
  const { preference, setPreference, palette } = useTheme();

  return (
    <View
      accessibilityLabel="Tema"
      accessibilityRole="radiogroup"
      className="flex-row gap-2 rounded-control p-1"
      style={{
        backgroundColor: tone === "inverse" ? palette.raised : palette.raised,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      {OPTIONS.map((opt) => {
        const selected = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            onPress={() => setPreference(opt.value)}
            className="flex-1 cursor-pointer items-center justify-center rounded-control px-3 py-2"
            style={{
              backgroundColor: selected ? palette.sheet : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: selected ? palette.border : "transparent",
            }}
          >
            <Text
              className="font-medium text-sm"
              style={{
                color: selected ? palette.ink : palette.muted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
