import { Redirect, Stack, usePathname } from "expo-router";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { journeyFinished } from "@/lib/journey";
import { resolveRoute } from "@/navigation/resolve-route";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout() {
  const ready = useProgressReady();
  const session = useSession();
  const pathname = usePathname();

  const destination = resolveRoute({
    ready,
    signedIn: Boolean(session),
    journeyDone: session ? journeyFinished(session.user.id) : false,
    group: "app",
    pathname,
  });

  if (destination) {
    return <Redirect href={destination as any} />;
  }

  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="path" />
        <Stack.Screen name="news" />
        <Stack.Screen name="talk" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="memory" />
        <Stack.Screen name="memory-palace" options={{ animation: "default" }} />
        <Stack.Screen name="pronunciation" options={{ animation: "default" }} />
        <Stack.Screen name="syntax-workshop" options={{ animation: "default" }} />
        <Stack.Screen name="settings" options={{ animation: "default" }} />
        <Stack.Screen name="guide" options={{ animation: "default" }} />
        <Stack.Screen name="paywall" options={{ animation: "default" }} />
        <Stack.Screen name="admin" options={{ animation: "default" }} />
        <Stack.Screen name="duel" options={{ animation: "default" }} />
        <Stack.Screen name="commute" options={{ animation: "default" }} />
        <Stack.Screen name="exam" options={{ animation: "default" }} />
        <Stack.Screen name="life" options={{ animation: "default" }} />
        <Stack.Screen name="org" options={{ animation: "default" }} />
        <Stack.Screen name="pairs" options={{ animation: "default" }} />
        <Stack.Screen name="persona" options={{ animation: "default" }} />
        <Stack.Screen name="prose" options={{ animation: "default" }} />
        <Stack.Screen name="score" options={{ animation: "default" }} />
        <Stack.Screen name="dossier" options={{ animation: "default" }} />
      </Stack>
    </AppShell>
  );
}
