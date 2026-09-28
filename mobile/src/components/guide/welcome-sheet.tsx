import { router } from "expo-router";
import { Text } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { ChunkButton } from "@/components/shell/chunk-button";
import { markGuideSeen, useGuideSeen } from "@/lib/guide";
import { tap } from "@/lib/haptics";

export function WelcomeSheet() {
  const seen = useGuideSeen("welcome");

  function close() {
    markGuideSeen("welcome");
    void tap("light");
  }

  return (
    <GlassSheet visible={!seen} onClose={close} label="Primeira visita">
      <Text className="font-displayItalic mt-3 text-headline text-ink">Vinte minutos. Uma prosa.</Text>
      <Text className="mt-3 text-base leading-7 text-ink">
        Toque numa palavra para o vocabulário. Ouvir já prepara a voz. Viva-voz segue sozinho.
      </Text>
      <ChunkButton
        className="mt-6 w-full"
        label="Começar a prosa"
        onPress={() => {
          close();
          router.push("/daily");
        }}
      />
      <ChunkButton className="mt-3 w-full" label="Pular" tone="ghost" onPress={close} />
    </GlassSheet>
  );
}
