import { Newsreader_400Regular, Newsreader_600SemiBold } from "@expo-google-fonts/newsreader";
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { SourceSans3_400Regular, SourceSans3_600SemiBold } from "@expo-google-fonts/source-sans-3";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/global.css";
import { isPublicPath } from "@/lib/guest";
import { journeyFinished } from "@/lib/journey";
import { ProsaQueryProvider, useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { peekSurfaceColor, ThemeProvider, useTheme } from "@/theme/ThemeContext";

export default function RootLayout() {
  const [loaded, error] = useFonts({
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
      document.title = "Prosa";
    }
  }, []);

  return (
    <>
      <Head>
        <title>Prosa</title>
        <meta name="description" content="Uma lição de vinte minutos por dia." />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      {!loaded && !error ? (
        <View style={{ flex: 1, backgroundColor: peekSurfaceColor() }} accessibilityLabel="Carregando Prosa" />
      ) : (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ThemeProvider>
              <ProsaQueryProvider>
                <ThemedStack />
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
  const pathname = usePathname();
  const router = useRouter();
  const open = Boolean(session);
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (ready && !open && !publicPath) {
      router.replace("/account");
    }
  }, [ready, open, publicPath, router]);

  useEffect(() => {
    if (!ready || !session) {
      return;
    }
    if (pathname === "/start" || pathname === "/settings" || pathname === "/guide" || pathname === "/placement" || pathname === "/paywall" || pathname === "/quiz") {
      return;
    }
    if (publicPath && pathname !== "/account") {
      return;
    }
    if (!journeyFinished(session.user.id)) {
      router.replace("/start");
    }
  }, [ready, session, publicPath, pathname, router]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: palette.surface }} accessibilityLabel="Carregando Prosa" />;
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, title: "Prosa", animation: "fade", contentStyle: { backgroundColor: palette.surface } }}>
        <Stack.Screen name="account" />
        <Stack.Screen name="reset" />
        <Stack.Screen name="cert/[token]" />
        <Stack.Screen name="dossier/[token]" />
        <Stack.Protected guard={open}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="memory" />
          <Stack.Screen name="news" />
          <Stack.Screen name="practice" />
          <Stack.Screen name="(session)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="start" />
          <Stack.Screen name="paywall" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="guide" />
          <Stack.Screen name="duel" />
          <Stack.Screen name="persona" />
          <Stack.Screen name="prose" />
          <Stack.Screen name="placement" />
          <Stack.Screen name="exam" />
          <Stack.Screen name="score" />
          <Stack.Screen name="pairs" />
          <Stack.Screen name="life" />
          <Stack.Screen name="dossier/index" />
          <Stack.Screen name="org" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
