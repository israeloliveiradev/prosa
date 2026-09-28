import { router, usePathname, type Href } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/shell/icon";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Logo } from "@/components/shell/logo";
import { givenName, useCopy } from "@/lib/i18n";
import { keepWords } from "@/lib/text";
import { signOut, useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

const ITEMS = [
  { href: "/", key: "navHome" },
  { href: "/memory", key: "navMemory" },
  { href: "/news", key: "navNews" },
  { href: "/practice", key: "navPractice" },
  { href: "/daily", key: "navLesson" },
] as const;

export function AppFrame({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const pathname = usePathname();
  const { palette } = useTheme();
  const copy = useCopy();
  const [menu, setMenu] = useState(false);
  const gutter = "px-5 py-8 md:mx-auto md:w-full md:max-w-3xl md:px-8 md:py-10 lg:max-w-6xl lg:px-12 lg:py-12";
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
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
      <View className="z-20 flex-row items-center justify-between border-b border-line bg-card px-4 py-3 lg:px-8">
        <View className="flex-row items-center gap-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu"
            onPress={() => setMenu(true)}
            className="min-h-12 min-w-12 cursor-pointer items-center justify-center lg:hidden"
          >
            <Icon name="menu" color={palette.onSurface} />
          </Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel="Prosa" onPress={() => router.push("/")} className="cursor-pointer">
            <Logo compact />
          </Pressable>
          <View className="hidden flex-row items-center gap-1 lg:flex">
            {ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} label={copy[item.key]} />
            ))}
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <LanguageSwitcher compact={Platform.OS !== "web"} />
          <AccountMenu />
        </View>
      </View>
      <View className="min-h-0 flex-1">{body}</View>
      {menu ? <MobileMenu onClose={() => setMenu(false)} /> : null}
    </SafeAreaView>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (!active) {
          router.push(href as "/");
        }
      }}
      className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${active ? "bg-emberSoft" : "bg-transparent"}`}
    >
      <Text className={`font-label text-base ${active ? "text-ember" : "text-muted"}`}>{keepWords(label)}</Text>
    </Pressable>
  );
}

function AccountMenu() {
  const copy = useCopy();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const initial = session ? givenName(session.user.email, session.user.display_name).slice(0, 1).toUpperCase() : "?";

  return (
    <View className="relative">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={session ? copy.settings : copy.signIn}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          if (!session) {
            router.push("/account");
            return;
          }
          setOpen((value) => !value);
        }}
        className="h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-ember"
      >
        <Text className="font-label text-base text-onEmber">{initial}</Text>
      </Pressable>
      {open && session ? (
        <View className="absolute right-0 top-14 z-50 w-64 rounded-3xl border border-line bg-card p-2">
          <MenuRow
            label={copy.settings}
            onPress={() => {
              setOpen(false);
              router.push("/settings" as Href);
            }}
          />
          <MenuRow
            label={copy.guide}
            onPress={() => {
              setOpen(false);
              router.push("/guide");
            }}
          />
          <MenuRow
            label={copy.navPro}
            onPress={() => {
              setOpen(false);
              router.push("/paywall");
            }}
          />
          {session.user.role === "admin" ? (
            <MenuRow
              label={copy.admin}
              onPress={() => {
                setOpen(false);
                router.push("/admin");
              }}
            />
          ) : null}
          <MenuRow
            label={copy.signOut}
            onPress={() => {
              setOpen(false);
              void signOut();
              router.replace("/");
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="menuitem" onPress={onPress} className="min-h-12 cursor-pointer justify-center rounded-2xl px-4">
      <Text className="font-label text-base text-ink">{keepWords(label)}</Text>
    </Pressable>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const copy = useCopy();
  const { palette } = useTheme();
  return (
    <View className="absolute inset-0 z-50 bg-card px-6 py-8 lg:hidden">
      <View className="flex-row items-center justify-between">
        <Logo compact />
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={onClose} className="min-h-12 min-w-12 cursor-pointer items-center justify-center">
          <Icon name="close" color={palette.onSurface} />
        </Pressable>
      </View>
      <View className="mt-10 gap-2">
        {ITEMS.map((item) => (
          <Pressable
            key={item.href}
            accessibilityRole="link"
            onPress={() => {
              onClose();
              router.push(item.href as "/");
            }}
            className="min-h-14 cursor-pointer justify-center rounded-2xl px-2"
          >
            <Text className="font-displayItalic text-3xl text-ink">{copy[item.key]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
