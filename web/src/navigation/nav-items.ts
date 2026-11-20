import type { TactileIconName } from "@/components/tactile/tactile-icon";
import type { ShellCopy } from "@/lib/copy/shell";

type LabelKey = { [K in keyof ShellCopy]: ShellCopy[K] extends string ? K : never }[keyof ShellCopy];

export interface NavItemConfig {
  id: string;
  path: "/" | "/path" | "/news" | "/talk" | "/profile" | "/settings" | "/guide";
  icon: TactileIconName;
  labelKey: LabelKey;
}

/**
 * Os cinco destinos do aplicativo: barra lateral no desktop/tablet, abas embaixo no celular.
 */
export const PRIMARY_NAV_ITEMS: readonly NavItemConfig[] = [
  { id: "today", path: "/", icon: "sun", labelKey: "navToday" },
  { id: "path", path: "/path", icon: "route", labelKey: "navPath" },
  { id: "reading", path: "/news", icon: "book", labelKey: "navReading" },
  { id: "talk", path: "/talk", icon: "chat", labelKey: "navTalk" },
  { id: "you", path: "/profile", icon: "user", labelKey: "navYou" },
];

/** Destinos de apoio, no menu da conta. */
export const SECONDARY_NAV_ITEMS: readonly NavItemConfig[] = [
  { id: "settings", path: "/settings", icon: "sliders", labelKey: "menuSettings" },
  { id: "guide", path: "/guide", icon: "help", labelKey: "menuGuide" },
];
