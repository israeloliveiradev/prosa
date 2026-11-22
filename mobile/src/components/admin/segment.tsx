import { Pressable, Text, View } from "react-native";
import { tactile } from "@/components/tactile/tokens";

/** Pílula selecionável do painel de admin (abas e filtros). */
export function AdminChip({
  label,
  selected,
  onPress,
  role = "radio",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: "radio" | "tab";
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === "tab" ? { selected } : { selected, checked: selected }}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backgroundColor: selected ? tactile.primary : tactile.surface,
        borderColor: selected ? tactile.primaryDark : tactile.border,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: selected ? "#FFFFFF" : tactile.ink }}>{label}</Text>
    </Pressable>
  );
}

export function AdminSegment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <AdminChip key={option.id} role="tab" label={option.label} selected={option.id === value} onPress={() => onChange(option.id)} />
      ))}
    </View>
  );
}
