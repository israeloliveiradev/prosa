import { Text, View } from "react-native";
import { tactile } from "@/components/tactile/tokens";

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View
      style={{
        minWidth: 120,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: tactile.border,
        backgroundColor: tactile.surface,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: tactile.muted }}>{label}</Text>
      <Text className="font-display font-extrabold" style={{ marginTop: 2, fontSize: 28, color: tactile.ink }}>
        {value}
      </Text>
    </View>
  );
}
