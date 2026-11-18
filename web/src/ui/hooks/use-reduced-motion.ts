import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = (e: MediaQueryListEvent) => {
        setReduced(e.matches);
      };
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
      const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
      return () => sub.remove();
    }
  }, []);

  return reduced;
}

export const useReducedMotion = useReducedMotionPref;
