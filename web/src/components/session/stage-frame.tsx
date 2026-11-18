import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import type { MindId } from "@/design/minds";

export interface StageFrameProps {
  mindId?: MindId;
  stageName: string;
  instruction: string;
  children: ReactNode;
  className?: string;
}

export function StageFrame({
  mindId = "curie",
  stageName,
  instruction,
  children,
  className = "",
}: StageFrameProps) {
  return (
    <View className={`w-full gap-6 select-none ${className}`}>
      {/* Cabeçalho da Etapa com a Mente Orientadora */}
      <View className="flex-row items-center gap-3.5 pb-4 border-b border-line">
        <View className="w-12 h-12 rounded-2xl bg-primarySoft items-center justify-center border border-primary/20">
          <Figure who={mindId} size={42} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="font-label text-xs uppercase tracking-wider text-primary">
            {stageName}
          </Text>
          <Text className="font-display text-xl font-bold text-ink truncate" numberOfLines={1}>
            {instruction}
          </Text>
        </View>
      </View>

      {/* Conteúdo Específico da Fase */}
      <View className="w-full flex-1">{children}</View>
    </View>
  );
}
