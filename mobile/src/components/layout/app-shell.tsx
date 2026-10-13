import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RailProvider } from "@/components/layout/rail-context";
import { RightRail } from "@/components/layout/right-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { pingApi } from "@/lib/api";

export function AppShell({ children }: { children: ReactNode }) {
  const { atLeast, isMobile } = useBreakpoint();
  const [apiUp, setApiUp] = useState(true);

  useEffect(() => {
    void pingApi().then(setApiUp);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "bottom", "left", "right"]}>
      {/* Alerta de API Offline */}
      {!apiUp ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void pingApi().then(setApiUp)}
          className="min-h-11 items-center justify-center bg-dangerSoft px-4 border-b border-danger/20"
        >
          <Text className="text-center font-label text-xs text-danger">
            Conexão instável com o servidor. Toque para tentar novamente.
          </Text>
        </Pressable>
      ) : null}

      <RailProvider>
        <View className="flex-1 flex-row overflow-hidden">
          {/* Barra Lateral (a partir de tablet >= 768px) */}
          {!isMobile ? <Sidebar /> : null}

          {/* Área Central de Conteúdo */}
          <View className="flex-1 min-w-0 flex-col overflow-hidden">{children}</View>

          {/* Coluna Lateral Contextual (a partir de laptop >= 1024px) */}
          {atLeast("laptop") ? <RightRail /> : null}
        </View>
      </RailProvider>
    </SafeAreaView>
  );
}
