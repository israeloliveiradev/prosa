export type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop";

const ORDER: Record<Breakpoint, number> = {
  mobile: 0,
  tablet: 1,
  laptop: 2,
  desktop: 3,
};

export function breakpointFor(width: number): Breakpoint {
  if (width >= 1280) {
    return "desktop";
  }
  if (width >= 1024) {
    return "laptop";
  }
  if (width >= 768) {
    return "tablet";
  }
  return "mobile";
}

export function isAtLeast(current: Breakpoint, target: Breakpoint): boolean {
  return ORDER[current] >= ORDER[target];
}
