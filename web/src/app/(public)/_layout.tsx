import { Redirect, Stack, usePathname } from "expo-router";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { journeyFinished } from "@/lib/journey";
import { resolveRoute } from "@/navigation/resolve-route";
import { useEntryHold } from "@/features/auth/model/entry-hold";

export default function PublicLayout() {
  const ready = useProgressReady();
  const session = useSession();
  const pathname = usePathname();
  // A tela de conta segura o redirecionamento enquanto sincroniza o primeiro dia.
  const entering = useEntryHold();

  const destination = entering
    ? null
    : resolveRoute({
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
    </Stack>
  );
}
