import { router, usePathname } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/shell/icon";
import { Logo } from "@/components/shell/logo";
import { ThemeSwitch } from "@/theme/theme-switch";
import { useTheme } from "@/theme/ThemeContext";

const ITEMS = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/news", label: "Notícias", icon: "news" },
  { href: "/practice", label: "Prática", icon: "practice" },
  { href: "/memory", label: "Memória", icon: "memory" },
  { href: "/daily", label: "Prosa", icon: "book" },
  { href: "/paywall", label: "Pro", icon: "mark" },
  { href: "/account", label: "Conta", icon: "user" },
] as const;

type NavItem = (typeof ITEMS)[number];

function NavButton({ href, label, icon, onNavigate }: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { palette } = useTheme();
  const active = pathname === href;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={() => {
        onNavigate?.();
        if (!active) {
          router.push(href);
        }
      }}
      className={`min-h-12 cursor-pointer flex-row items-center gap-3 rounded-full px-3 transition-opacity duration-200 ${active ? "bg-ember" : "bg-transparent"}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <Icon name={icon} color={active ? palette.onPrimary : "#E8D5C8"} />
      <Text className={`font-label text-base ${active ? "text-onEmber" : "text-sidebarMuted"}`}>{label}</Text>
    </Pressable>
  );
}

function SideNav() {
  return (
    <View className="hidden h-full w-60 shrink-0 flex-col bg-sidebar px-6 py-8 lg:flex">
      <Logo tone="light" />
      <Text className="mt-4 max-w-[180px] text-sm leading-5 text-sidebarMuted">Vinte minutos. Todo dia.</Text>
      <ScrollView className="mt-8 min-h-0 flex-1" contentContainerStyle={{ gap: 4 }} showsVerticalScrollIndicator={false}>
        {ITEMS.map((item) => (
          <NavButton key={item.href} {...item} />
        ))}
      </ScrollView>
      <View className="pt-6">
        <ThemeSwitch tone="inverse" />
      </View>
    </View>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <View className="absolute inset-0 z-50 bg-sidebar px-6 py-8 lg:hidden">
      <View className="flex-row items-center justify-between">
        <Logo tone="light" compact />
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={onClose} className="min-h-12 min-w-12 cursor-pointer items-center justify-center">
          <Icon name="close" color="#F9F8F6" />
        </Pressable>
      </View>
      <View className="mt-10 gap-1">
        {ITEMS.map((item) => (
          <NavButton key={item.href} {...item} onNavigate={onClose} />
        ))}
      </View>
      <View className="mt-10">
        <ThemeSwitch tone="inverse" />
      </View>
    </View>
  );
}

export function AppFrame({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const pathname = usePathname();
  const { palette } = useTheme();
  const [menu, setMenu] = useState(false);
  const gutter = "px-5 py-8 md:mx-auto md:w-full md:max-w-3xl md:px-8 md:py-10 lg:max-w-6xl lg:px-12 lg:py-12";
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View className={gutter}>{children}</View>
    </ScrollView>
  ) : (
    <View className="min-w-0 flex-1">{children}</View>
  );

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <View className="min-h-0 flex-1 flex-row">
        <SideNav />
        <View className="min-h-0 flex-1">
          <View className="flex-row items-center justify-between px-5 py-3 lg:hidden" style={{ paddingTop: Platform.OS === "web" ? 12 : 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir menu"
              accessibilityState={{ expanded: menu }}
              onPress={() => setMenu(true)}
              className="min-h-12 min-w-12 cursor-pointer items-center justify-center"
            >
              <Icon name="menu" color={palette.onSurface} />
            </Pressable>
            <Logo compact />
            <View className="w-12" />
          </View>
          {body}
        </View>
      </View>
      {menu ? <MobileMenu onClose={() => setMenu(false)} /> : null}
    </SafeAreaView>
  );
}
