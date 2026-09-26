import { Pressable, Text, View } from "react-native";
import { useTheme, type ThemePreference } from "@/theme/ThemeContext";

export function ThemeSwitch({ tone = "plain" }: { tone?: "plain" | "inverse" }) {
  const { preference, setPreference, palette } = useTheme();
  const dark = preference === "dark";
  const inverse = tone === "inverse";
  const label = inverse ? "text-sidebarInk" : "text-ink";
  const quiet = inverse ? "text-sidebarMuted" : "text-muted";

  function choose(next: ThemePreference) {
    if (next !== preference) {
      setPreference(next);
    }
  }

  return (
    <View accessibilityLabel="Tema" className="flex-row items-center gap-3">
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !dark }} onPress={() => choose("light")} className="min-h-12 cursor-pointer justify-center">
        <Text className={`font-label text-base ${dark ? quiet : label}`}>Claro</Text>
      </Pressable>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Tema escuro"
        accessibilityState={{ checked: dark }}
        onPress={() => choose(dark ? "light" : "dark")}
        className="h-11 w-16 cursor-pointer justify-center rounded-full px-1"
        style={{ backgroundColor: inverse ? "#3A3330" : palette.outline }}
      >
        <View
          className="h-8 w-8 rounded-full"
          style={{ marginLeft: dark ? 24 : 0, backgroundColor: inverse ? "#F9F8F6" : palette.primary }}
        />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: dark }} onPress={() => choose("dark")} className="min-h-12 cursor-pointer justify-center">
        <Text className={`font-label text-base ${dark ? label : quiet}`}>Escuro</Text>
      </Pressable>
    </View>
  );
}
