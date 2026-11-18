import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";

export default function NotFoundScreen() {
  const router = useRouter();
  const { palette } = useTheme();

  const handleHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.replace("/");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.frame,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: palette.sheet,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 32,
          alignItems: "center",
          gap: 16,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: palette.raised,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="info" size={24} tone="muted" />
        </View>

        <Text variant="title" weight="semibold" tone="ink" align="center">
          Página não encontrada
        </Text>

        <Text variant="body" tone="muted" align="center">
          O caminho que você tentou acessar não existe, foi movido ou você precisa entrar na sua conta.
        </Text>

        <Button
          variant="primary"
          size="md"
          onPress={handleHome}
          testID="not-found-back-home"
          className="mt-2"
        >
          Voltar ao início
        </Button>
      </View>
    </View>
  );
}
