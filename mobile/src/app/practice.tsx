import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";

export default function PracticeScreen() {
  const session = useSession();

  function open(href: "/duel" | "/persona") {
    void tap("medium");
    router.push(session ? href : "/account");
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <View>
          <Text className="font-displayItalic text-display text-ink">Prática</Text>
          <Text className="mt-3 max-w-xl text-lg leading-7 text-muted">Um duelo curto ou uma conversa no tom do lugar.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => open("/duel")} className="min-h-14 cursor-pointer justify-center border-b border-line py-4">
          <Text className="font-displayItalic text-3xl text-ink">Duelo</Text>
          <Text className="mt-1 text-base text-muted">120 segundos. Uma frase, quatro escolhas.</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => open("/persona")} className="min-h-14 cursor-pointer justify-center border-b border-line py-4">
          <Text className="font-displayItalic text-3xl text-ink">Cena</Text>
          <Text className="mt-1 text-base text-muted">Uma conversa real, com a dica cultural em seguida.</Text>
        </Pressable>
      </View>
    </AppFrame>
  );
}
