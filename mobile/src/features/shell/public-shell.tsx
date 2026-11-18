import type { ReactNode } from "react";
import { View, ScrollView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Logo } from "@/components/shell/logo";
import { useBreakpoint } from "@/ui/hooks/use-breakpoint";
import { CastRow } from "@/features/auth/components/cast-banner";

export interface PublicShellProps {
  children: ReactNode;
  maxWidth?: number;
  testID?: string;
  side?: ReactNode;
}

export function PublicShell({
  children,
  maxWidth = 440,
  testID = "public-shell",
  side,
}: PublicShellProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useBreakpoint();
  const showSplit = isDesktopOrLaptop && Boolean(side);

  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        backgroundColor: palette.frame,
        ...(Platform.OS === "web" ? { minHeight: "100dvh" as any } : {}),
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: Math.max(insets.top, 40),
          paddingBottom: Math.max(insets.bottom, 40),
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {showSplit ? (
          <View
            style={{
              width: "100%",
              maxWidth: 980,
            }}
          >
            {/* Header unificado com Logo no topo à esquerda */}
            <View style={{ marginBottom: 36, alignSelf: "flex-start" }}>
              <Pressable
                onPress={() => router.push("/")}
                accessibilityRole="link"
                accessibilityLabel="Ir para o início"
                style={Platform.OS === "web" ? ({ cursor: "pointer" } as any) : undefined}
              >
                <Logo />
              </Pressable>
            </View>

            {/* Linha principal com alinhamento pelo topo (flex-start) */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 56,
                width: "100%",
              }}
            >
              {/* Coluna Esquerda: Hero + Elenco */}
              <View style={{ flex: 1, maxWidth: 480 }}>
                {side}
              </View>

              {/* Coluna Direita: Cartão de Entrada */}
              <View
                style={{
                  width: 420,
                  maxWidth: "100%",
                  backgroundColor: palette.sheet,
                  borderColor: palette.border,
                  borderWidth: 1,
                  borderRadius: radius.sheet,
                  paddingHorizontal: 32,
                  paddingVertical: 36,
                }}
              >
                {children}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ width: "100%", maxWidth, alignItems: "center" }}>
            {/* Marca no topo no modo compacto */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Pressable
                onPress={() => router.push("/")}
                accessibilityRole="link"
                accessibilityLabel="Ir para o início"
                style={Platform.OS === "web" ? ({ cursor: "pointer" } as any) : undefined}
              >
                <Logo />
              </Pressable>
            </View>

            {side ? (
              <View style={{ marginBottom: 24, width: "100%", alignItems: "center" }}>
                <CastRow />
              </View>
            ) : null}

            {/* Folha Branca Centrada */}
            <View
              style={{
                width: "100%",
                backgroundColor: palette.sheet,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: radius.sheet,
                paddingHorizontal: 28,
                paddingVertical: 32,
              }}
            >
              {children}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
