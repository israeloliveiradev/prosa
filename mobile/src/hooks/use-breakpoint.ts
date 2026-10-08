import { useWindowDimensions } from "react-native";
import { breakpointFor, isAtLeast, type Breakpoint } from "@/lib/breakpoint";

export function useBreakpoint(): {
  bp: Breakpoint;
  width: number;
  atLeast: (target: Breakpoint) => boolean;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
} {
  const { width } = useWindowDimensions();
  const bp = breakpointFor(width);

  return {
    bp,
    width,
    atLeast: (target: Breakpoint) => isAtLeast(bp, target),
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isLaptop: bp === "laptop",
    isDesktop: bp === "desktop",
  };
}
