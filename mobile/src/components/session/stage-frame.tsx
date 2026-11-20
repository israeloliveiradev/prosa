import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import type { MindId } from "@/design/minds";
import { useTheme } from "@/theme/ThemeContext";

export interface StageFrameProps {
  mindId: MindId;
  mindName: string;
  mindRole: string;
  kicker: string;
  instruction: string;
  planned?: string;
  children: ReactNode;
}

/** Cabeçalho de cada etapa: a mente que conduz, o passo e o que fazer agora. */
export function StageFrame({ mindId, mindName, mindRole, kicker, instruction, planned, children }: StageFrameProps) {
  const { palette } = useTheme();
  return (
    <View className="w-full">
      <View
        className="flex-row items-center gap-4 rounded-2xl px-4 py-3"
        style={{ backgroundColor: palette.raised, borderWidth: 1, borderColor: palette.border, borderBottomWidth: 3 }}
      >
        <View
          className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
          style={{ backgroundColor: palette.card, borderWidth: 2, borderColor: palette.accent }}
        >
          <Figure who={mindId} size={60} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs font-extrabold uppercase tracking-widest text-primary">{kicker}</Text>
          <Text className="mt-1 font-sans text-base font-semibold leading-6 text-ink">{instruction}</Text>
          <Text className="mt-1 font-sans text-xs text-muted">
            {mindName} · {mindRole}
            {planned ? ` · ${planned}` : ""}
          </Text>
        </View>
      </View>
      <View className="mt-5 w-full">{children}</View>
    </View>
  );
}
