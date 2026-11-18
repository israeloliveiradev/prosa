import { Redirect, Stack, usePathname } from "expo-router";
import { Platform } from "react-native";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { journeyFinished } from "@/lib/journey";
import { resolveRoute } from "@/navigation/resolve-route";

export default function FocusLayout() {
  const ready = useProgressReady();
  const session = useSession();
  const pathname = usePathname();

  const destination = resolveRoute({
    ready,
    signedIn: Boolean(session),
    journeyDone: session ? journeyFinished(session.user.id) : false,
    group: "focus",
    pathname,
  });

  if (destination) {
    return <Redirect href={destination as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        presentation: Platform.OS === "web" ? "card" : "fullScreenModal",
      }}
    >
      <Stack.Screen name="daily" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="start" />
      <Stack.Screen name="placement" />
    </Stack>
  );
}
