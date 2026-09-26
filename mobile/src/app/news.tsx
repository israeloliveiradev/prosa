import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { DailyNews } from "@/components/home/daily-news";
import { AppFrame } from "@/components/shell/app-frame";
import { useSession } from "@/lib/session";

export default function NewsScreen() {
  const session = useSession();

  return (
    <AppFrame>
      <View className="gap-8">
        <View>
          <Text className="font-displayItalic text-display text-ink">Notícias</Text>
          <Text className="mt-3 max-w-xl text-lg leading-7 text-muted">Uma história do dia, no nível que você escolhe.</Text>
        </View>
        {session ? (
          <DailyNews />
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push("/account")} className="min-h-12 cursor-pointer justify-center">
            <Text className="font-label text-base text-ink">Entre na conta para ler a notícia</Text>
          </Pressable>
        )}
      </View>
    </AppFrame>
  );
}
