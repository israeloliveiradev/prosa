import type { ReactNode } from "react";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ children }: TooltipProps) {
  return <>{children}</>;
}
