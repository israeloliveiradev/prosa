import { useWindowDimensions } from "react-native";
import { breakpointFor, isAtLeast, type Breakpoint } from "@/lib/breakpoint";

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const bp = breakpointFor(width);

  return {
    breakpoint: bp,
    width,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isLaptop: bp === "laptop",
    isDesktop: bp === "desktop",
    isAtLeast: (target: Breakpoint) => isAtLeast(bp, target),
    isDesktopOrLaptop: isAtLeast(bp, "laptop"),
  };
}
