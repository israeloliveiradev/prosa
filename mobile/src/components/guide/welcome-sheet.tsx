import { router, type Href } from "expo-router";
import { Text } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { ChunkButton } from "@/components/shell/chunk-button";
import { markGuideSeen, useGuideSeen } from "@/lib/guide";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { journeyFinished } from "@/lib/journey";
import { useSession } from "@/lib/session";

export function WelcomeSheet() {
  const seen = useGuideSeen("welcome");
  const copy = useCopy();
  const session = useSession();
  const firstDay = Boolean(session && !journeyFinished(session.user.id));

  function close() {
    markGuideSeen("welcome");
    void tap("light");
  }

  return (
    <GlassSheet visible={!seen} onClose={close} label={copy.welcomeLabel}>
      <Text className="font-displayItalic mt-3 text-headline text-ink">{copy.welcomeTitle}</Text>
      <Text className="mt-3 text-base leading-7 text-ink">{copy.welcomeBody}</Text>
      <ChunkButton
        className="mt-6 w-full"
        label={copy.startToday}
        onPress={() => {
          close();
          router.push((firstDay ? "/start" : "/daily") as Href);
        }}
      />
      <ChunkButton className="mt-3 w-full" label={copy.skip} tone="ghost" onPress={close} />
    </GlassSheet>
  );
}
