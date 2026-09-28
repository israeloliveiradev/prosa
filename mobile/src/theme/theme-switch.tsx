import { Pressable, Text, View } from "react-native";
import { keepWords } from "@/lib/text";
import { darkPalette, lightPalette } from "@/design/tokens";
import { useTheme, type ThemePreference } from "@/theme/ThemeContext";

export function ThemeSwitch({ tone = "plain" }: { tone?: "plain" | "inverse" }) {
  const { preference, setPreference } = useTheme();

  function choose(next: ThemePreference) {
    if (next !== preference) {
      setPreference(next);
    }
  }

  if (tone === "inverse") {
    return (
      <View accessibilityLabel="Tema" className="flex-row items-center gap-6">
        <Pressable accessibilityRole="button" accessibilityState={{ selected: preference === "light" }} onPress={() => choose("light")} className="min-h-12 cursor-pointer justify-center">
          <Text className={`font-label text-base ${preference === "light" ? "text-sidebarInk" : "text-sidebarMuted"}`}>Claro</Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Tema escuro"
          accessibilityState={{ checked: preference === "dark" }}
          onPress={() => choose(preference === "dark" ? "light" : "dark")}
          className="h-11 w-16 cursor-pointer justify-center rounded-full px-1"
          style={{ backgroundColor: "#3A3330" }}
        >
          <View className="h-8 w-8 rounded-full" style={{ marginLeft: preference === "dark" ? 24 : 0, backgroundColor: "#F9F8F6" }} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: preference === "dark" }} onPress={() => choose("dark")} className="min-h-12 cursor-pointer justify-center">
          <Text className={`font-label text-base ${preference === "dark" ? "text-sidebarInk" : "text-sidebarMuted"}`}>Escuro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View accessibilityLabel="Tema" className="flex-row gap-3">
      <ThemeCard
        label="Claro"
        selected={preference === "light"}
        paper={lightPalette.surface}
        card={lightPalette.surfaceBright}
        ember={lightPalette.primary}
        ink={lightPalette.onSurface}
        onPress={() => choose("light")}
      />
      <ThemeCard
        label="Escuro"
        selected={preference === "dark"}
        paper={darkPalette.surface}
        card={darkPalette.surfaceBright}
        ember={darkPalette.primary}
        ink={darkPalette.onSurface}
        onPress={() => choose("dark")}
      />
    </View>
  );
}

function ThemeCard({
  label,
  selected,
  paper,
  card,
  ember,
  ink,
  onPress,
}: {
  label: string;
  selected: boolean;
  paper: string;
  card: string;
  ember: string;
  ink: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="min-h-28 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-[24px]"
      style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? ember : card, backgroundColor: paper }}
    >
      <View className="px-4 py-4">
        <View className="h-10 rounded-2xl" style={{ backgroundColor: card }} />
        <View className="mt-3 h-2 w-16 rounded-full" style={{ backgroundColor: ember }} />
        <Text className="mt-4 font-label text-base" style={{ color: ink }}>
          {keepWords(label)}
        </Text>
      </View>
    </Pressable>
  );
}
