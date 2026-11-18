import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Figure } from "@/components/cast/figure";
import { Logo } from "@/components/shell/logo";
import { useBreakpoint } from "@/hooks/use-breakpoint";

export interface PublicShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function PublicShell({ children, title, subtitle }: PublicShellProps) {
  const { atLeast } = useBreakpoint();
  const isDesktop = atLeast("laptop");

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 flex-row">
        {/* Lado Esquerdo Editorial (Desktop >= 1024px) */}
        {isDesktop ? (
          <View className="flex-1 bg-card border-r border-line p-12 lg:p-16 flex-col justify-between select-none">
            <Pressable onPress={() => router.push("/")} className="cursor-pointer self-start">
              <Logo />
            </Pressable>

            <View className="max-w-md gap-6">
              <View className="w-24 h-24 rounded-3xl bg-primarySoft items-center justify-center border border-primary/20">
                <Figure who="einstein" size={80} />
              </View>
              <Text className="font-display text-4xl font-extrabold text-ink leading-tight">
                Vinte minutos por dia para dominar um novo idioma.
              </Text>
              <Text className="text-base text-muted leading-7">
                Histórias envolventes, repetição espaçada na memória de longo prazo e diálogos guiados pelas maiores mentes da história.
              </Text>
            </View>

            <Text className="text-xs text-muted">
              © {new Date().getFullYear()} Prosa. Todos os direitos reservados.
            </Text>
          </View>
        ) : null}

        {/* Lado Direito / Principal (Card Centralizado) */}
        <View className="flex-1 items-center justify-center p-6 lg:p-12">
          {!isDesktop ? (
            <View className="mb-8 items-center">
              <Logo />
            </View>
          ) : null}

          <View className="w-full max-w-[440px] bg-card border-2 border-line rounded-[28px] p-6 lg:p-8 shadow-sm">
            {title ? (
              <View className="mb-6">
                <Text className="font-display text-2xl font-bold text-ink">{title}</Text>
                {subtitle ? <Text className="text-sm text-muted mt-1 leading-5">{subtitle}</Text> : null}
              </View>
            ) : null}

            {children}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
