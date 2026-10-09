import { useEffect, type ReactNode } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useTheme } from "@/theme/ThemeContext";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const { palette } = useTheme();
  const { atLeast } = useBreakpoint();
  const isDesktopModal = atLeast("laptop");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <Modal visible={open} transparent animationType={isDesktopModal ? "fade" : "slide"} onRequestClose={onClose}>
      <View
        className={`flex-1 bg-black/45 ${
          isDesktopModal ? "items-center justify-center p-6" : "justify-end"
        }`}
      >
        {/* Backdrop click to dismiss */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Modal / Bottom Sheet Body */}
        <View
          className={`relative z-10 bg-card border border-line ${
            isDesktopModal
              ? "w-full max-w-[520px] rounded-[24px] shadow-2xl p-6"
              : "w-full rounded-t-[28px] p-6 pb-10 max-h-[85%]"
          }`}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-line mb-4">
            <Text className="font-display text-xl font-bold text-ink">{title ?? ""}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              className="w-9 h-9 items-center justify-center rounded-full bg-sunken cursor-pointer active:opacity-70"
            >
              <Icon name="x" color={palette.onSurfaceVariant} size={18} />
            </Pressable>
          </View>

          {/* Content */}
          <View className="mb-4">{children}</View>

          {/* Optional Footer */}
          {footer ? <View className="pt-3 border-t border-line">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
