import type { IconName } from "@/ui/icon";

export interface NavItemConfig {
  id: string;
  path: string;
  icon: IconName;
  labelKey: string;
  defaultLabel: string;
  enLabel: string;
  adminOnly?: boolean;
}

/**
 * Destinos primários (máximo 5) exibidos na barra de abas do celular
 * e no topo da navegação da sidebar no desktop.
 */
export const PRIMARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "home",
    path: "/",
    icon: "home",
    labelKey: "navHome",
    defaultLabel: "Início",
    enLabel: "Home",
  },
  {
    id: "practice",
    path: "/practice",
    icon: "practice",
    labelKey: "navPractice",
    defaultLabel: "Prática",
    enLabel: "Practice",
  },
  {
    id: "memory",
    path: "/memory",
    icon: "memory",
    labelKey: "navMemory",
    defaultLabel: "Memória",
    enLabel: "Memory",
  },
  {
    id: "news",
    path: "/news",
    icon: "news",
    labelKey: "navNews",
    defaultLabel: "Notícias",
    enLabel: "News",
  },
  {
    id: "profile",
    path: "/profile",
    icon: "user",
    labelKey: "navProfile",
    defaultLabel: "Você",
    enLabel: "You",
  },
] as const;

/**
 * Destinos secundários exibidos no rodapé da sidebar e nos menus de suporte.
 */
export const SECONDARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "settings",
    path: "/settings",
    icon: "settings",
    labelKey: "navSettings",
    defaultLabel: "Ajustes",
    enLabel: "Settings",
  },
  {
    id: "guide",
    path: "/guide",
    icon: "book",
    labelKey: "navGuide",
    defaultLabel: "Como usar",
    enLabel: "Guide",
  },
  {
    id: "admin",
    path: "/admin",
    icon: "shield",
    labelKey: "navAdmin",
    defaultLabel: "Administração",
    enLabel: "Admin",
    adminOnly: true,
  },
] as const;
