import { Pressable, Text, View } from "react-native";
import { TactileIcon, type TactileIconName } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";

export interface NavItemProps {
  id: string;
  label: string;
  icon: TactileIconName;
  active: boolean;
  onPress: () => void;
  /** "wide": ícone e rótulo em linha; "rail": ícone sobre rótulo curto; "tab": aba do celular. */
  variant: "wide" | "rail" | "tab";
}

/** Item de navegação tátil: o ativo vira tecla verde com degrau; os outros ficam planos. */
export function NavItem({ id, label, icon, active, onPress, variant }: NavItemProps) {
  if (variant === "tab") {
    return (
      <Pressable
        testID={`tab-${id}`}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        aria-current={active ? "page" : undefined}
        onPress={onPress}
        style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 6, cursor: "pointer" } as object}
      >
        <View
          style={{
            width: 44,
            height: 30,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? tactile.primary : "transparent",
            boxShadow: active ? `0 3px 0 ${tactile.primaryDark}` : "none",
          } as object}
        >
          <TactileIcon name={icon} size={20} color={active ? "#FFFFFF" : tactile.muted} strokeWidth={active ? 2.4 : 2} />
        </View>
        <Text numberOfLines={1} style={{ maxWidth: "100%", fontFamily: tactile.font, fontSize: 11, fontWeight: active ? "800" : "600", color: active ? tactile.primaryInk : tactile.muted }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const rail = variant === "rail";
  return (
    <Pressable
      testID={`nav-item-${id}`}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      aria-current={active ? "page" : undefined}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) =>
        ({
          flexDirection: rail ? "column" : "row",
          alignItems: "center",
          gap: rail ? 4 : 12,
          paddingVertical: rail ? 10 : 11,
          paddingHorizontal: rail ? 4 : 14,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: active ? tactile.primaryDark : hovered ? tactile.border : "transparent",
          backgroundColor: active ? tactile.primary : hovered ? tactile.raised : "transparent",
          boxShadow: active ? `0 4px 0 ${tactile.primaryDark}` : "none",
          cursor: "pointer",
        }) as object
      }
    >
      <TactileIcon name={icon} size={rail ? 22 : 20} color={active ? "#FFFFFF" : tactile.primary} strokeWidth={active ? 2.4 : 2} />
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          textAlign: rail ? "center" : "left",
          fontFamily: tactile.font,
          fontSize: rail ? 11 : 15,
          fontWeight: active ? "800" : "700",
          color: active ? "#FFFFFF" : tactile.body,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
