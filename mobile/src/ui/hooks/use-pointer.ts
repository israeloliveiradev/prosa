import { useEffect, useState } from "react";
import { Platform } from "react-native";

export type PointerType = "fine" | "coarse";

export function usePointer(): PointerType {
  const [pointer, setPointer] = useState<PointerType>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(pointer: fine)").matches ? "fine" : "coarse";
    }
    return "coarse";
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia("(pointer: fine)");
    const handler = (e: MediaQueryListEvent) => {
      setPointer(e.matches ? "fine" : "coarse");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return pointer;
}
