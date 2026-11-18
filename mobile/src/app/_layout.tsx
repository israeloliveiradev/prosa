import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  Literata_400Regular,
  Literata_600SemiBold,
} from "@expo-google-fonts/literata";
import { Newsreader_400Regular, Newsreader_600SemiBold } from "@expo-google-fonts/newsreader";
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { SourceSans3_400Regular, SourceSans3_600SemiBold } from "@expo-google-fonts/source-sans-3";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/global.css";
import { ProsaQueryProvider, useProgressReady } from "@/lib/query";
import { ProsaProvider } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { peekSurfaceColor, ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { Toaster } from "@/ui";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "IBM Plex Sans": IBMPlexSans_400Regular,
    "IBM Plex Sans Medium": IBMPlexSans_500Medium,
    "IBM Plex Sans SemiBold": IBMPlexSans_600SemiBold,
    Literata: Literata_400Regular,
    "Literata SemiBold": Literata_600SemiBold,
    Newsreader: Newsreader_600SemiBold,
    "Newsreader Text": Newsreader_400Regular,
    Nunito: Nunito_500Medium,
    "Nunito Bold": Nunito_700Bold,
    "Nunito ExtraBold": Nunito_800ExtraBold,
    "Source Sans 3": SourceSans3_400Regular,
    "Source Sans 3 Semibold": SourceSans3_600SemiBold,
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "Prosa — Maestria Polímata em 20 Minutos";
    }
  }, []);

  return (
    <>
      <Head>
        <title>Prosa — Maestria Polímata em 20 Minutos</title>
        <meta name="description" content="Uma lição de vinte minutos por dia com mentores polímatas." />
        <meta name="theme-color" content="#FDFBF7" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      {!loaded && !error ? (
        <View style={{ flex: 1, backgroundColor: peekSurfaceColor() }} accessibilityRole="progressbar" accessibilityLabel="Carregando Prosa" />
      ) : (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ThemeProvider>
              <ProsaQueryProvider>
                <ProsaProvider>
                  <ThemedStack />
                </ProsaProvider>
              </ProsaQueryProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      )}
    </>
  );
}

function ThemedStack() {
  const { scheme, palette } = useTheme();
  const ready = useProgressReady();
  const session = useSession();
  const open = Boolean(session);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: palette.surface }} accessibilityRole="progressbar" accessibilityLabel="Carregando Prosa" />;
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          title: "Prosa — Maestria Polímata em 20 Minutos",
          animation: "fade",
          contentStyle: { backgroundColor: palette.surface },
        }}
      >
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(focus)" />
        <Stack.Screen name="(public)" />
      </Stack>
      <Toaster />
    </>
  );
}
