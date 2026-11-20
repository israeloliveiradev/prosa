import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";
import type { SessionStatus } from "@/features/home/model/home-model";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";

/** Botão principal da barra lateral: começar, continuar ou rever a sessão de hoje (/daily). */
export function TodayButton({ status, minutes, compact = false }: { status: SessionStatus; minutes: number; compact?: boolean }) {
  const t = useAreaCopy(SHELL_COPY);
  const router = useRouter();
  const done = status === "done";
  const label = status === "continue" ? t.continueToday : done ? t.reviewToday : t.startToday;
  const short = status === "continue" ? t.continueShort : done ? t.doneShort : t.startShort;
  const icon = <TactileIcon name={done ? "check" : "play"} size={compact ? 22 : 18} color={done ? tactile.primaryInk : "#FFFFFF"} fill={done ? "none" : "#FFFFFF"} strokeWidth={done ? 3 : 2} />;

  return (
    <View testID="sidebar-open-daily" accessibilityLabel={label}>
      <TactileButton variant={done ? "secondary" : "primary"} size={compact ? "md" : "lg"} fullWidth onPress={() => router.push("/daily")} style={compact ? { paddingLeft: 6, paddingRight: 6, flexDirection: "column", gap: 4 } : undefined}>
        {compact ? (
          <View style={{ alignItems: "center", gap: 4 }}>
            {icon}
            <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: "800", color: done ? tactile.primaryInk : "#FFFFFF" }}>
              {short}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            {icon}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 19, fontWeight: "800", color: done ? tactile.ink : "#FFFFFF", textAlign: "left" }}>{label}</Text>
              <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "700", color: done ? tactile.muted : "rgba(255,255,255,0.85)", textAlign: "left" }}>{t.minutes(minutes)}</Text>
            </View>
          </View>
        )}
      </TactileButton>
    </View>
  );
}
