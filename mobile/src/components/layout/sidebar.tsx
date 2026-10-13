import { router, usePathname, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/shell/icon";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { givenName, useCopy } from "@/lib/i18n";
import { clearLocalProgress, useProgress } from "@/lib/progress";
import { signOut, useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

interface NavItemDef {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItemDef[] = [
  { href: "/", label: "Aprender", icon: "trail" },
  { href: "/practice", label: "Praticar", icon: "bolt" },
  { href: "/memory", label: "Memória", icon: "brain" },
  { href: "/news", label: "Notícias", icon: "news" },
  { href: "/profile", label: "Perfil", icon: "user" },
];

export function Sidebar() {
  const pathname = usePathname();
  const session = useSession();
  const progress = useProgress();
  const copy = useCopy();
  const { palette } = useTheme();
  const { bp } = useBreakpoint();
  const isCompact = bp === "laptop"; // 1024 a 1279px mostra apenas ícones
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const userName = session ? givenName(session.user.email, session.user.display_name) : "Usuário";
  const userInitial = userName.slice(0, 1).toUpperCase();

  return (
    <View
      className={`border-r border-line bg-card flex-col justify-between py-6 ${
        isCompact ? "w-20 items-center px-2" : "w-[248px] px-4"
      }`}
    >
      {/* Top: Logo & Nav items */}
      <View className="gap-6 w-full">
        {/* Logo */}
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/")}
          className={`cursor-pointer ${isCompact ? "items-center" : "px-2"}`}
        >
          <Logo compact={isCompact} decorative />
        </Pressable>

        {/* Links de navegação */}
        <View className="gap-1.5 w-full">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname === "/(app)" || pathname === "/(app)/"
                : pathname.startsWith(item.href);

            const navButton = (
              <Pressable
                key={item.href}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setMoreMenuOpen(false);
                  router.push(item.href as Href);
                }}
                className={`flex-row items-center rounded-2xl cursor-pointer select-none transition-colors ${
                  isCompact ? "justify-center h-12 w-12" : "px-3.5 py-3 gap-3.5"
                } ${active ? "bg-primarySoft border-l-4 border-primary" : "hover:bg-sunken/60"}`}
              >
                <Icon
                  name={item.icon}
                  color={active ? palette.primary : palette.onSurfaceVariant}
                  size={22}
                  strokeWidth={active ? 2 : 1.75}
                />
                {!isCompact ? (
                  <Text
                    className={`font-label text-base ${active ? "text-primary font-bold" : "text-muted"}`}
                  >
                    {item.label}
                  </Text>
                ) : null}
              </Pressable>
            );

            if (isCompact) {
              return (
                <Tooltip key={item.href} content={item.label}>
                  {navButton}
                </Tooltip>
              );
            }

            return navButton;
          })}
        </View>
      </View>

      {/* Bottom: Pro Card, More Menu & User Profile */}
      <View className="gap-3 w-full relative">
        {/* Banner Prosa Pro (se for plano grátis) */}
        {!progress.pro && !isCompact ? (
          <View className="rounded-2xl border-2 border-pro/20 bg-pro/5 p-4 gap-2.5">
            <View className="flex-row items-center gap-2">
              <Icon name="crown" color={palette.pro} size={20} />
              <Text className="font-label text-xs font-bold text-pro uppercase tracking-wider">
                Prosa Pro
              </Text>
            </View>
            <Text className="text-xs text-muted leading-4">
              Histórico ilimitado e tópicos por inteligência artificial.
            </Text>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => router.push("/paywall")}
              className="mt-1"
            >
              <Text className="font-label text-xs text-pro font-bold">Assinar Pro</Text>
            </Button>
          </View>
        ) : null}

        {/* Popover / Menu Mais */}
        {moreMenuOpen ? (
          <View
            className={`absolute bottom-full mb-2 z-50 rounded-2xl border-2 border-line bg-card p-2 shadow-xl ${
              isCompact ? "left-full ml-2 w-56" : "left-0 right-0"
            }`}
          >
            <Pressable
              onPress={() => {
                setMoreMenuOpen(false);
                router.push("/settings");
              }}
              className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sunken cursor-pointer"
            >
              <Icon name="gear" color={palette.onSurfaceVariant} size={18} />
              <Text className="font-label text-sm text-ink">{copy.settings}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMoreMenuOpen(false);
                router.push("/guide");
              }}
              className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sunken cursor-pointer"
            >
              <Icon name="book" color={palette.onSurfaceVariant} size={18} />
              <Text className="font-label text-sm text-ink">{copy.guide}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMoreMenuOpen(false);
                router.push("/paywall");
              }}
              className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sunken cursor-pointer"
            >
              <Icon name="crown" color={palette.pro} size={18} />
              <Text className="font-label text-sm text-pro font-bold">{copy.navPro}</Text>
            </Pressable>

            {session?.user.role === "admin" ? (
              <Pressable
                onPress={() => {
                  setMoreMenuOpen(false);
                  router.push("/admin");
                }}
                className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sunken cursor-pointer"
              >
                <Icon name="shield" color={palette.onSurfaceVariant} size={18} />
                <Text className="font-label text-sm text-ink">{copy.admin}</Text>
              </Pressable>
            ) : null}

            <View className="h-px bg-line my-1" />

            <Pressable
              onPress={() => {
                setMoreMenuOpen(false);
                void signOut().finally(() => {
                  clearLocalProgress();
                  router.replace("/account");
                });
              }}
              className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dangerSoft cursor-pointer"
            >
              <Icon name="close" color={palette.danger} size={18} />
              <Text className="font-label text-sm text-danger">{copy.signOut}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Botão "Mais" */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setMoreMenuOpen((open) => !open)}
          className={`flex-row items-center rounded-2xl cursor-pointer hover:bg-sunken/60 ${
            isCompact ? "justify-center h-12 w-12" : "px-3.5 py-2.5 gap-3"
          }`}
        >
          <Icon name="more" color={palette.onSurfaceVariant} size={22} />
          {!isCompact ? <Text className="font-label text-sm text-muted">Mais opções</Text> : null}
        </Pressable>

        {/* Card do Usuário */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/profile" as Href)}
          className={`flex-row items-center rounded-2xl border border-line bg-sunken/40 cursor-pointer ${
            isCompact ? "justify-center h-12 w-12" : "p-2 gap-3"
          }`}
        >
          <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
            <Text className="font-label text-sm font-bold text-onPrimary">{userInitial}</Text>
          </View>
          {!isCompact ? (
            <View className="min-w-0 flex-1">
              <Text className="font-label text-sm text-ink truncate" numberOfLines={1}>
                {userName}
              </Text>
              <Text className="text-xs text-muted truncate" numberOfLines={1}>
                {session?.user.email ?? ""}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
