import type { ReactNode } from "react";
import { Sheet } from "@/ui";

export function GlassSheet({
  visible,
  onClose,
  label,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={label} testID="session-glass-sheet" surface="tactile">
      {children}
    </Sheet>
  );
}
