import type { ReactNode } from "react";
import { Modal, Platform, Pressable, Text, View, type ViewStyle } from "react-native";
import { useCopy } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";

export function GlassSheet({
  visible,
  onClose,
  label,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const copy = useCopy();
  const { scheme } = useTheme();
  const dark = scheme === "dark";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 justify-end"
        style={{
          backgroundColor: dark ? "rgba(0,0,0,0.72)" : "rgba(9,9,11,0.45)",
          pointerEvents: "box-none",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${copy.closeSheet}. ${label}`}
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          accessibilityViewIsModal
          className="rounded-t-[28px] px-5 pb-10 pt-4"
          style={{
            position: "relative",
            zIndex: 2,
            pointerEvents: "auto",
            backgroundColor: dark ? "rgba(24,24,27,0.94)" : "rgba(255,255,255,0.94)",
            borderTopWidth: 1,
            borderColor: dark ? "rgba(244,244,245,0.14)" : "rgba(9,9,11,0.08)",
            ...(Platform.OS === "web" ? ({ backdropFilter: "blur(18px)" } as ViewStyle) : null),
          }}
        >
          <View className="mb-5 h-1 w-10 self-center rounded-full bg-line" />
          <View className="flex-row items-center justify-between">
            <Text className="font-label text-sm text-muted">{label}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.closeSheet}
              onPress={onClose}
              className="min-h-12 min-w-12 cursor-pointer items-center justify-center"
            >
              <Text className="font-label text-sm text-ember">{copy.closeSheet}</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
