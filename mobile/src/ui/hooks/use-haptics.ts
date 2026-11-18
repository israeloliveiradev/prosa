import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticFeedback = "selection" | "light" | "medium" | "success" | "error";

export function useHaptics() {
  const trigger = (type: HapticFeedback = "selection") => {
    if (Platform.OS === "web") {
      return;
    }
    try {
      switch (type) {
        case "selection":
          void Haptics.selectionAsync();
          break;
        case "light":
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "success":
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "error":
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // Ignore unsupported devices / environments
    }
  };

  return { trigger };
}
