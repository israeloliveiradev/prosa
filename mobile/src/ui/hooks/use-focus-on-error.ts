import { useEffect, type RefObject } from "react";
import { Platform } from "react-native";

export function useFocusOnError(
  error: string | null | undefined,
  targetRef?: RefObject<any>
) {
  useEffect(() => {
    if (!error) return;
    if (Platform.OS === "web") {
      const el = targetRef?.current;
      if (el && typeof el.focus === "function") {
        el.focus();
      }
    } else if (targetRef?.current && typeof targetRef.current.focus === "function") {
      targetRef.current.focus();
    }
  }, [error, targetRef]);
}
