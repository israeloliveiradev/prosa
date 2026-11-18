import { Redirect, Stack, usePathname } from "expo-router";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { journeyFinished } from "@/lib/journey";
import { resolveRoute } from "@/navigation/resolve-route";

export default function PublicLayout() {
  const ready = useProgressReady();
  const session = useSession();
  const pathname = usePathname();

  const destination = resolveRoute({
    ready,
    signedIn: Boolean(session),
    journeyDone: session ? journeyFinished(session.user.id) : false,
    group: "public",
    pathname,
  });

  if (destination) {
    return <Redirect href={destination as any} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="account" />
      <Stack.Screen name="reset" />
      <Stack.Screen name="dev/ui" />
      <Stack.Screen name="cert/[token]" />
      <Stack.Screen name="dossier/[token]" />
    </Stack>
  );
}
