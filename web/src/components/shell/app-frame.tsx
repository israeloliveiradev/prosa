import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

/**
 * Adaptador de transição: preserva compatibilidade com as 24 telas existentes
 * enquanto o layout do grupo (app)/_layout.tsx gerencia o shell global (AppShell).
 * Será removido na Task 15.
 */
export function AppFrame({
  children,
  scroll = true,
  compact = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  compact?: boolean;
}) {
  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 48, width: "100%" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full px-5 py-6 md:mx-auto md:max-w-3xl md:px-8 md:py-8 lg:max-w-5xl lg:px-10 lg:py-8">
          {children}
        </View>
      </ScrollView>
    );
  }

  return <View style={{ flex: 1, minWidth: 0 }}>{children}</View>;
}
