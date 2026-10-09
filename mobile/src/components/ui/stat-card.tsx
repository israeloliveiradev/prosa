import type { ReactNode } from "react";
import { Text, View } from "react-native";

export interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

export function StatCard({ icon, value, label, className = "" }: StatCardProps) {
  return (
    <View
      className={`rounded-[20px] border-2 border-line bg-card p-4 items-center justify-center min-w-[120px] flex-1 ${className}`}
    >
      <View className="mb-2 items-center justify-center">{icon}</View>
      <Text className="font-heavy text-2xl text-ink tracking-tight">{value}</Text>
      <Text className="font-label text-xs text-muted mt-1 uppercase tracking-wider text-center">
        {label}
      </Text>
    </View>
  );
}
