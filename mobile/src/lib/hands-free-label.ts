import { copy } from "@/lib/i18n";
import type { HandsFreeKind } from "@/lib/hands-free";

export function handsFreeLabel(kind: HandsFreeKind, unit: number, total: number): string {
  const ui = copy();
  if (kind === "intro") {
    return ui.handsFreeScene;
  }
  if (kind === "gap") {
    return `${ui.yourTurn} · ${ui.phrase} ${unit} ${ui.ofWord} ${total}`;
  }
  if (kind === "confirm") {
    return `${ui.confirmStep} · ${ui.phrase} ${unit} ${ui.ofWord} ${total}`;
  }
  return `${ui.listenStep} · ${ui.phrase} ${unit} ${ui.ofWord} ${total}`;
}
