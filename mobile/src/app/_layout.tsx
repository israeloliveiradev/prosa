import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader";
import { SourceSans3_400Regular, SourceSans3_600SemiBold } from "@expo-google-fonts/source-sans-3";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/global.css";
import { ProsaQueryProvider } from "@/lib/query";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Newsreader: Newsreader_600SemiBold,
    "Source Sans 3": SourceSans3_400Regular,
    "Source Sans 3 Semibold": SourceSans3_600SemiBold,
  });

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ProsaQueryProvider>
            <ThemedStack />
          </ProsaQueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const { scheme, palette } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: palette.surface } }} />
    </>
  );
}
