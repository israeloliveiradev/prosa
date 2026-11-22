import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useAreaCopy } from "@/lib/copy/area";
import { PRACTICE_NAV } from "@/lib/copy/practice-nav";
import { tactile } from "@/components/tactile/tokens";

/** Página das práticas: coluna central, cabeçalho tátil e (opcional) botão de voltar ao hub. */
export function PracticePage({
  kicker,
  title,
  dek,
  back,
  children,
  testID,
  maxWidth = 852,
}: {
  kicker: string;
  title: string;
  dek?: string;
  /** Mostra o botão que volta para /practice (o rótulo vem da cópia; "←" antigo vira o rótulo). */
  back?: boolean | string;
  children: ReactNode;
  testID?: string;
  maxWidth?: number;
}) {
  const nav = useAreaCopy(PRACTICE_NAV);
  return (
    <View testID={testID} className="w-full gap-6 pb-16" style={{ maxWidth, alignSelf: "center", paddingHorizontal: 16 }}>
      <View className="gap-2">
        {back ? (
          <View className="self-start">
            <TactileButton testID="practice-back" label={`← ${nav.back}`} accessibilityLabel={nav.backA11y} variant="ghost" size="sm" onPress={() => router.push("/practice")} />
          </View>
        ) : null}
        <Text style={{ color: tactile.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{kicker}</Text>
        <Text accessibilityRole="header" className="font-display text-3xl font-extrabold tracking-tight" style={{ color: tactile.ink }}>
          {title}
        </Text>
        {dek ? (
          <Text className="text-base leading-6" style={{ color: tactile.body }}>
            {dek}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Estado honesto de erro com tentar de novo. */
export function ErrorPanel({ title, body, retry, onRetry, testID }: { title: string; body?: string; retry: string; onRetry: () => void; testID?: string }) {
  return (
    <View testID={testID} accessibilityRole="alert" className="gap-3 rounded-2xl border p-5" style={{ borderColor: "#FECDD3", backgroundColor: tactile.dangerSoft }}>
      <Text className="text-base font-extrabold" style={{ color: tactile.danger }}>
        {title}
      </Text>
      {body ? (
        <Text className="text-base leading-6" style={{ color: tactile.danger }}>
          {body}
        </Text>
      ) : null}
      <View className="self-start">
        <TactileButton testID={testID ? `${testID}-retry` : "practice-retry"} label={retry} variant="crimson" onPress={onRetry} />
      </View>
    </View>
  );
}
