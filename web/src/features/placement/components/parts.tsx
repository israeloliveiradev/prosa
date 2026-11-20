import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import type { PlacementCopy } from "@/lib/copy/placement";
import type { PlacementErrorKind } from "@/features/placement/model/placement-flow";

/** Rótulo pequeno em caixa alta, usado como título de seção. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="font-sans text-[11px] font-extrabold uppercase tracking-widest text-[#64748B]">{children}</Text>
  );
}

/** Selo do nível CEFR no estilo tátil (bloco com sombra sólida). */
export function LevelBadge({ level, size = "lg", testID }: { level: string; size?: "md" | "lg"; testID?: string }) {
  const box = size === "lg" ? "h-20 w-20 rounded-2xl" : "h-12 w-12 rounded-xl";
  const text = size === "lg" ? "text-3xl" : "text-lg";
  return (
    <View
      className={`${box} items-center justify-center bg-[#0D9488] shadow-[0_4px_0_#0F766E]`}
      style={{ borderWidth: 2, borderColor: "#0F766E" }}
      accessibilityRole="text"
    >
      <Text testID={testID} className={`font-sans ${text} font-black text-white`}>
        {level}
      </Text>
    </View>
  );
}

/** Etiqueta curta (habilidade, faixa). */
const CHIP_TONES = {
  neutral: { borderColor: "#E2E8F0", backgroundColor: "#F5F0E8", color: "#334155" },
  teal: { borderColor: "#99F6E4", backgroundColor: "#F0FDFA", color: "#0F766E" },
  amber: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB", color: "#92400E" },
} as const;

export function Chip({ label, tone = "neutral" }: { label: string; tone?: keyof typeof CHIP_TONES }) {
  const colors = CHIP_TONES[tone];
  return (
    <View
      className="rounded-full px-3 py-1"
      style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.backgroundColor }}
    >
      <Text className="font-sans text-xs font-bold" style={{ color: colors.color }}>
        {label}
      </Text>
    </View>
  );
}

const ERROR_KEY: Record<PlacementErrorKind, keyof PlacementCopy> = {
  offline: "errOffline",
  slow: "errSlow",
  "not-ready": "errNotReady",
  "rate-limited": "errRateLimited",
  session: "errSession",
  closed: "errClosed",
  unknown: "errUnknown",
};

export function errorMessage(t: PlacementCopy, kind: PlacementErrorKind): string {
  return t[ERROR_KEY[kind]];
}

/**
 * Aviso honesto de falha com a ação que resolve: tentar de novo ou, se a sessão
 * caiu, entrar outra vez.
 */
export function PlacementNotice({
  t,
  kind,
  title,
  onRetry,
  busy = false,
  testID = "placement-error",
}: {
  t: PlacementCopy;
  kind: PlacementErrorKind;
  title?: string;
  onRetry?: () => void;
  busy?: boolean;
  testID?: string;
}) {
  const session = kind === "session";
  return (
    <TactileCard animateEntry={false} className="p-5" style={{ borderColor: "#FECACA", padding: 20 }}>
      <View testID={testID} accessibilityRole="alert" accessibilityLiveRegion="polite" className="gap-3">
        {title ? <Text className="font-sans text-base font-extrabold text-[#111C2D]">{title}</Text> : null}
        <Text className="font-sans text-sm leading-6 text-[#B91C1C]">{errorMessage(t, kind)}</Text>
        {session ? (
          <View className="self-start">
            <TactileButton variant="secondary" size="md" label={t.signIn} onPress={() => router.replace("/account" as Href)} />
          </View>
        ) : onRetry ? (
          <View className="self-start" testID={`${testID}-retry`}>
            <TactileButton variant="secondary" size="md" label={t.retry} disabled={busy} onPress={onRetry} />
          </View>
        ) : null}
      </View>
    </TactileCard>
  );
}

/** Linha de carregamento discreta (texto real do estado, sem barra simulada). */
export function LoadingLine({ label, detail, testID }: { label: string; detail?: string; testID?: string }) {
  return (
    <View testID={testID} accessibilityRole="progressbar" accessibilityLabel={label} className="gap-2 py-2">
      <View className="flex-row items-center gap-3">
        <View className="h-3 w-3 rounded-full bg-[#0D9488]" />
        <Text className="font-sans text-base font-bold text-[#111C2D]">{label}</Text>
      </View>
      {detail ? <Text className="font-sans text-sm leading-6 text-[#64748B]">{detail}</Text> : null}
    </View>
  );
}
