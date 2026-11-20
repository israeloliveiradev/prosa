import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useTheme } from "@/theme/ThemeContext";

/** Cartão tátil da sessão, com as cores do tema (claro/escuro). */
export function StageCard({
  children,
  className = "",
  style,
  tone = "card",
}: {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  tone?: "card" | "raised";
}) {
  const { palette } = useTheme();
  return (
    <TactileCard
      animateEntry={false}
      className={className}
      // O TactileCard no web espalha o estilo num objeto: precisa vir achatado (sem arrays).
      style={StyleSheet.flatten([
        {
          backgroundColor: tone === "raised" ? palette.raised : palette.card,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 20,
          padding: 20,
        },
        style,
      ])}
    >
      {/* No web o TactileCard é um <div> comum: a View devolve o layout em coluna do React Native. */}
      <View>{children}</View>
    </TactileCard>
  );
}

export function Kicker({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "muted" | "accent" }) {
  const color = tone === "primary" ? "text-primary" : tone === "accent" ? "text-accentInk" : "text-muted";
  return <Text className={`font-sans text-xs font-extrabold uppercase tracking-widest ${color}`}>{children}</Text>;
}

export function StageTitle({ children }: { children: ReactNode }) {
  return <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{children}</Text>;
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const { palette } = useTheme();
  const colors =
    tone === "error"
      ? { bg: palette.pillNegativeBg, ink: palette.pillNegativeInk }
      : tone === "success"
        ? { bg: palette.pillPositiveBg, ink: palette.pillPositiveInk }
        : { bg: palette.pillNeutralBg, ink: palette.pillNeutralInk };
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "error" ? "assertive" : "polite"}
      className="mt-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: colors.bg }}
    >
      <Text className="font-sans text-sm font-semibold leading-5" style={{ color: colors.ink }}>
        {children}
      </Text>
    </View>
  );
}

export type ChoiceState = "idle" | "selected" | "right" | "wrong";

/** Opção tátil (borda inferior grossa), usada em perguntas e escolhas. */
export function ChoiceTile({
  label,
  state = "idle",
  disabled,
  onPress,
  accessibilityLabel,
  className = "",
}: {
  label: string;
  state?: ChoiceState;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  className?: string;
}) {
  const { palette } = useTheme();
  const look =
    state === "right"
      ? { bg: palette.pillPositiveBg, edge: palette.positive, ink: palette.pillPositiveInk }
      : state === "wrong"
        ? { bg: palette.pillNegativeBg, edge: palette.negative, ink: palette.pillNegativeInk }
        : state === "selected"
          ? { bg: palette.active, edge: palette.primary, ink: palette.ink }
          : { bg: palette.card, edge: palette.control, ink: palette.ink };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled), selected: state !== "idle" }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 cursor-pointer justify-center rounded-2xl px-4 py-3 ${className}`}
      style={{
        backgroundColor: look.bg,
        borderWidth: 2,
        borderColor: state === "idle" ? palette.border : look.edge,
        borderBottomWidth: 4,
        borderBottomColor: look.edge,
      }}
    >
      <Text className="font-sans text-base font-semibold leading-6" style={{ color: look.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Pequena estatística real (rótulo + valor). */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const { palette } = useTheme();
  return (
    <View
      className="min-w-[140px] flex-1 rounded-2xl px-4 py-3"
      style={{ backgroundColor: palette.raised, borderWidth: 1, borderColor: palette.border, borderBottomWidth: 3 }}
    >
      <Text className="font-sans text-xs font-bold uppercase tracking-wider text-muted">{label}</Text>
      <Text className="mt-1 font-display text-2xl font-extrabold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
      {hint ? <Text className="mt-1 font-sans text-xs text-muted">{hint}</Text> : null}
    </View>
  );
}
