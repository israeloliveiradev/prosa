import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { TactileIcon, type TactileIconName } from "./tactile-icon";
import { tactile } from "./tokens";

export interface TactileMenuProps {
  open: boolean;
  onClose: () => void;
  /** Elemento que abriu o menu; o painel aparece logo abaixo dele. */
  anchor: RefObject<View | null>;
  align?: "left" | "right";
  width?: number;
  label: string;
  children: ReactNode;
  testID?: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Menu suspenso tátil num Modal transparente (Esc e toque fora fecham). */
export function TactileMenu({ open, onClose, anchor, align = "left", width = 300, label, children, testID }: TactileMenuProps) {
  const window = useWindowDimensions();
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const node = anchor.current;
    if (!node) {
      setBox({ x: 8, y: 8, width: 0, height: 0 });
      return;
    }
    node.measureInWindow((x, y, w, h) => setBox({ x, y, width: w, height: h }));
  }, [open, anchor, window.width, window.height]);

  const panelWidth = Math.min(width, window.width - 16);
  const left = box
    ? align === "left"
      ? Math.max(8, Math.min(box.x, window.width - panelWidth - 8))
      : Math.max(8, Math.min(box.x + box.width - panelWidth, window.width - panelWidth - 8))
    : 8;
  const top = box ? box.y + box.height + 8 : 8;

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,28,45,0.06)", cursor: "default" } as object}>
        {box ? (
          <Pressable
            testID={testID}
            accessibilityRole="menu"
            accessibilityLabel={label}
            onPress={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              top,
              left,
              width: panelWidth,
              maxHeight: Math.max(200, window.height - top - 16),
              backgroundColor: tactile.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: tactile.border,
              padding: 8,
              boxShadow: `0 4px 0 ${tactile.border}, 0 18px 40px rgba(17,28,45,0.14)`,
              overflow: "hidden",
              cursor: "default",
            } as object}
          >
            {children}
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

export interface TactileMenuItemProps {
  label: string;
  detail?: string;
  icon?: TactileIconName;
  leading?: ReactNode;
  onPress: () => void;
  selected?: boolean;
  tone?: "default" | "danger" | "accent";
  disabled?: boolean;
  testID?: string;
}

export function TactileMenuItem({ label, detail, icon, leading, onPress, selected = false, tone = "default", disabled = false, testID }: TactileMenuItemProps) {
  const color = tone === "danger" ? tactile.danger : tone === "accent" ? tactile.primaryInk : tactile.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) =>
        ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 44,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: selected ? tactile.primarySoft : pressed || hovered ? tactile.raised : "transparent",
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }) as object
      }
    >
      {leading ?? (icon ? <TactileIcon name={icon} size={18} color={tone === "danger" ? tactile.danger : tactile.primary} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "700", color }}>
          {label}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 12, color: tactile.muted, marginTop: 1 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      {selected ? <TactileIcon name="check" size={18} color={tactile.primary} /> : null}
    </Pressable>
  );
}

export function TactileMenuDivider() {
  return <View style={{ height: 1, backgroundColor: tactile.border, marginVertical: 6, marginHorizontal: 4 }} />;
}

export function TactileMenuHeading({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: tactile.muted, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 }}>
      {children}
    </Text>
  );
}
