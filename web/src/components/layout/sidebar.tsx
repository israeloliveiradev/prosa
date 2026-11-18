import { router, usePathname, type Href } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
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
  badge?: string;
  isSpecial?: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  { href: "/", label: "Trilha de Aventura", icon: "trail" },
  { href: "/daily", label: "Sessão Diária 20m", icon: "timer" },
  { href: "/duel", label: "Duelo 120s", icon: "swords" },
  { href: "/memory", label: "Palácio de Memória", icon: "brain" },
  { href: "/news", label: "Áudio Commute", icon: "headphones" },
  { href: "/profile", label: "Perfil & Conquistas", icon: "user" },
  { href: "/paywall", label: "Prosa Pro", icon: "crown", isSpecial: true },
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

  const userName = session ? givenName(session.user.email, session.user.display_name) : "Você";
  const userInitial = userName.slice(0, 1).toUpperCase();

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRightWidth: 2,
        borderRightColor: "#E2E8F0",
        boxShadow: "4px 0 0 #F5F0E8",
        width: isCompact ? 80 : 264,
        paddingHorizontal: isCompact ? 8 : 16,
        paddingVertical: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        zIndex: 50,
      }}
    >
      {/* Top: Official Logo & Nav items */}
      <View className="gap-6 w-full">
        {/* Official Prosa Logo (Dark Squircle with Stylized P + Cyan Accent) */}
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/")}
          className={`cursor-pointer ${isCompact ? "items-center" : "px-2"}`}
        >
          <Logo compact={isCompact} decorative showSubtitle />
        </Pressable>

        {/* Links de navegação Táteis 3D */}
        <View className="gap-2 w-full">
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
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: isCompact ? 0 : 14,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: active
                    ? "#00685F"
                    : item.isSpecial
                    ? "#FEF3C7"
                    : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: active
                    ? "#0F766E"
                    : item.isSpecial
                    ? "#FCD34D"
                    : "#E2E8F0",
                  boxShadow: active
                    ? "0 4px 0 #0F766E"
                    : item.isSpecial
                    ? "0 3px 0 #D97706"
                    : "0 3px 0 #E2E8F0",
                  cursor: "pointer",
                  width: isCompact ? 48 : "100%",
                  height: isCompact ? 48 : undefined,
                  justifyContent: isCompact ? "center" : "flex-start",
                }}
              >
                <Icon
                  name={item.icon}
                  color={active ? "#FFFFFF" : item.isSpecial ? "#B45309" : "#64748B"}
                  size={20}
                  strokeWidth={active ? 2.2 : 1.75}
                />
                {!isCompact ? (
                  <View style={{ flex: 1, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: active ? "800" : "700",
                        color: active ? "#FFFFFF" : item.isSpecial ? "#B45309" : "#111C2D",
                      }}
                    >
                      {item.label}
                    </Text>
                    {item.isSpecial ? <Text style={{ fontSize: 13 }}>👑</Text> : null}
                  </View>
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

      {/* Bottom: Active Mentor Widget (Albert Einstein) & User Bar */}
      <View className="gap-4 w-full relative">
        {/* Mentor Widget estilo Stitch */}
        {!isCompact ? (
          <View className="relative bg-raised rounded-2xl p-3.5 border border-line shadow-[0_4px_0_#E2E8F0]">
            <View className="absolute -top-1.5 left-6 w-3 h-3 bg-raised border-t border-l border-line rotate-45" />
            <Text className="font-reading text-xs text-ink mb-2.5 italic">
              “Pronto para o ritual de hoje, {userName}?”
            </Text>
            <View className="flex-row items-center gap-2.5">
              <View className="relative w-9 h-9">
                <View className="w-full h-full rounded-full overflow-hidden border border-line shadow-sm">
                  <Image
                    source={{
                      uri: "/cast/einstein.png",
                    }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success items-center justify-center border-2 border-white shadow-sm">
                  <Text className="text-[9px] text-white font-bold">✓</Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="font-label text-xs font-bold text-ink">Albert Einstein</Text>
                <Text className="text-[9px] uppercase tracking-wider text-muted font-bold">
                  Mentor Polímata
                </Text>
              </View>
            </View>
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
              accessibilityRole="button"
              onPress={() => {
                setMoreMenuOpen(false);
                router.push("/settings");
              }}
              className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 active:bg-sunken/80"
            >
              <Icon name="gear" color={palette.onSurfaceVariant} size={18} />
              <Text className="font-label text-sm text-ink">{copy.settings}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMoreMenuOpen(false);
                router.push("/guide");
              }}
              className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 active:bg-sunken/80"
            >
              <Icon name="book" color={palette.onSurfaceVariant} size={18} />
              <Text className="font-label text-sm text-ink">{copy.guide}</Text>
            </Pressable>

            <View className="my-1 border-t border-line" />

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMoreMenuOpen(false);
                clearLocalProgress();
                void signOut();
                router.replace("/account");
              }}
              className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 active:bg-dangerSoft"
            >
              <Icon name="x" color={palette.negative} size={18} />
              <Text className="font-label text-sm text-danger">{copy.signOut}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Barra do Usuário */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setMoreMenuOpen(!moreMenuOpen)}
          className={`flex-row items-center rounded-2xl border border-line bg-card p-2 active:bg-raised transition-colors ${
            isCompact ? "justify-center" : "gap-3"
          }`}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primarySoft">
            <Text className="font-label text-sm font-bold text-primary">{userInitial}</Text>
          </View>
          {!isCompact ? (
            <View className="flex-1 min-w-0">
              <Text className="font-label text-sm font-bold text-ink truncate">{userName}</Text>
              <Text className="text-xs text-muted truncate">{session?.user?.email ?? "Offline"}</Text>
            </View>
          ) : null}
          {!isCompact ? (
            <Icon name="more" color={palette.onSurfaceVariant} size={18} />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
