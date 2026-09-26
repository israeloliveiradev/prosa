import { Text, View } from "react-native";

export function StreakFlame({ days, freezes }: { days: number; freezes: number }) {
  const pause = freezes === 1 ? "1 pausa guardada" : `${freezes} pausas guardadas`;
  return (
    <View accessibilityLabel={`${days} dias de ofensiva. ${pause}.`} className="items-start md:items-end">
      <Text className="font-display text-headline text-ember md:text-display" style={{ fontVariant: ["tabular-nums"] }}>
        {String(days).padStart(2, "0")}
      </Text>
      <Text className="font-label text-xs uppercase tracking-widest text-muted">{days === 1 ? "dia" : "dias"}</Text>
      <Text className="mt-2 text-sm text-muted">{pause}</Text>
    </View>
  );
}
