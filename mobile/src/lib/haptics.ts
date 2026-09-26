import * as Haptics from "expo-haptics";

export async function tap(kind: "heavy" | "medium" | "light" | "success"): Promise<void> {
  try {
    if (kind === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const style = {
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      light: Haptics.ImpactFeedbackStyle.Light,
    }[kind];
    await Haptics.impactAsync(style);
  } catch {
    return;
  }
}
