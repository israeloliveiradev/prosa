import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Icon, type IconName } from "@/ui/icon";
import { Text } from "@/ui/text";

export interface NavItemProps {
  id: string;
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
  badge?: string | number;
  testID?: string;
}

/**
 * Item de navegação padronizado da barra lateral e abas.
 * Linha de 34 px, ícone de 16 px em muted, rótulo body.
 * Ativo: pílula active com raio 8 e rótulo e ícone em ink (sem barra colorida).
 */
export function NavItem({
  id,
  label,
  icon,
  active,
  onPress,
  badge,
  testID = `nav-item-${id}`,
}: NavItemProps) {
  const { palette } = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => ({
        height: 36,
        paddingHorizontal: 10,
        borderRadius: radius.card,
        backgroundColor: active
          ? palette.active
          : hovered
          ? palette.active
          : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      })}
    >
      <Icon
        name={icon}
        size={18}
        strokeWidth={active ? 2 : 1.5}
        tone={active ? "ink" : "muted"}
      />
      <Text
        variant="body"
        weight={active ? "medium" : "regular"}
        tone={active ? "ink" : "muted"}
        className="flex-1"
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge !== undefined ? (
        <View
          style={{
            backgroundColor: active ? palette.accent : palette.raised,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: radius.chip,
          }}
        >
          <Text
            variant="small"
            tone={active ? "onPrimary" : "muted"}
            weight="500"
          >
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
