import { Redirect, router, usePathname, type Href } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/shell/icon";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Logo } from "@/components/shell/logo";
import { pingApi } from "@/lib/api";
import { isPublicPath } from "@/lib/guest";
import { givenName, useCopy } from "@/lib/i18n";
import { keepWords } from "@/lib/text";
import { clearLocalProgress } from "@/lib/progress";
import { signOut, useSession } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useTheme } from "@/theme/ThemeContext";

const ITEMS = [
  { href: "/", key: "navHome" },
  { href: "/daily", key: "navLesson" },
  { href: "/memory", key: "navMemory" },
  { href: "/practice", key: "navPractice" },
  { href: "/news", key: "navNews" },
] as const;

type HeaderMenu = "account" | "track" | null;

function insideHeaderPopovers(target: EventTarget | null): boolean {
  let current: { closest?: (selector: string) => unknown; parentElement?: unknown } | null = target as {
    closest?: (selector: string) => unknown;
    parentElement?: unknown;
  } | null;
  if (current && typeof current.closest !== "function") {
    current = current.parentElement as typeof current;
  }
  return Boolean(current?.closest?.("#prosa-header-popovers"));
}

export function AppFrame({ children, scroll = true, compact = false }: { children: ReactNode; scroll?: boolean; compact?: boolean }) {
  const pathname = usePathname();
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();
  const locked = !session;
  const [menu, setMenu] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<HeaderMenu>(null);
  const [apiUp, setApiUp] = useState(true);
  const desktop = useWindowDimensions().width >= 1024;
  const gutter = "w-full px-5 py-8 md:mx-auto md:max-w-3xl md:px-8 md:py-10 lg:max-w-6xl lg:px-12 lg:py-12";
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 48, width: "100%" }} keyboardShouldPersistTaps="handled">
      <View className={gutter}>{children}</View>
    </ScrollView>
  ) : (
    <View className="min-w-0 flex-1">{children}</View>
  );

  useEffect(() => {
    void pingApi().then(setApiUp);
  }, []);

  useEffect(() => {
    setMenu(false);
    setHeaderMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (desktop) {
      setMenu(false);
    }
  }, [desktop]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !headerMenu) {
      return;
    }
    const onClick = (event: Event) => {
      if (insideHeaderPopovers(event.target)) {
        return;
      }
      setHeaderMenu(null);
    };
    const onKey = (event: { key: string }) => {
      if (event.key === "Escape") {
        setHeaderMenu(null);
      }
    };
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [headerMenu]);

  const { atLeast } = useBreakpoint();

  if (locked && !isPublicPath(pathname)) {
    return <Redirect href="/account" />;
  }

  if (atLeast("tablet") && !locked) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right", "bottom"]}>
      {headerMenu && Platform.OS !== "web" ? (
        <Pressable accessible={false} onPress={() => setHeaderMenu(null)} className="absolute inset-0 z-40" />
      ) : null}
      {apiUp ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void pingApi().then(setApiUp)}
          className="min-h-12 items-center justify-center bg-roseSoft px-4"
        >
          <Text className="text-center text-sm text-roseInk">{copy.apiDown}</Text>
        </Pressable>
      )}
      <View className="relative z-50 flex-row items-center justify-between border-b border-line bg-card px-4 py-3 lg:px-8">
        <View className="flex-row items-center gap-6">
          {desktop || locked || compact ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.openMenu}
              onPress={() => {
                setHeaderMenu(null);
                setMenu(true);
              }}
              className="min-h-12 min-w-12 cursor-pointer items-center justify-center"
            >
              <Icon name="menu" color={palette.onSurface} />
            </Pressable>
          )}
          {locked ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={copy.logoHome}
              onPress={() => router.replace("/account")}
              className="cursor-pointer"
            >
              <Logo compact decorative />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={copy.logoHome}
              onPress={() => {
                setHeaderMenu(null);
                router.push("/");
              }}
              className="cursor-pointer"
            >
              <Logo compact decorative />
            </Pressable>
          )}
          {locked || compact ? null : (
            <View className="hidden flex-row items-center gap-1 lg:flex">
              {ITEMS.map((item) => (
                <NavLink key={item.href} href={item.href} label={copy[item.key]} onNavigate={() => setHeaderMenu(null)} />
              ))}
            </View>
          )}
        </View>
        {locked ? (
          <View />
        ) : (
          <View nativeID="prosa-header-popovers" collapsable={false} className="flex-row items-center gap-2">
            <LanguageSwitcher
              compact={Platform.OS !== "web"}
              open={headerMenu === "track"}
              onToggle={() => setHeaderMenu((current) => (current === "track" ? null : "track"))}
              onClose={() => setHeaderMenu(null)}
            />
            <AccountMenu open={headerMenu === "account"} onToggle={() => setHeaderMenu((current) => (current === "account" ? null : "account"))} onClose={() => setHeaderMenu(null)} />
          </View>
        )}
      </View>
      <View className="min-h-0 flex-1">{body}</View>
      {menu && !locked ? <MobileMenu onClose={() => setMenu(false)} /> : null}
    </SafeAreaView>
  );
}

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      onPress={() => {
        onNavigate?.();
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

function AccountMenu({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const copy = useCopy();
  const session = useSession();
  const initial = session ? givenName(session.user.email, session.user.display_name).slice(0, 1).toUpperCase() : "";
  const [confirmOut, setConfirmOut] = useState(false);

  if (!session) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.signIn}
        onPress={() => router.push("/account")}
        className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-ember px-5"
      >
        <Text className="font-label text-base text-onEmber">{copy.signIn}</Text>
      </Pressable>
    );
  }

  return (
    <View className="relative z-50">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.settings}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        className="h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-ember"
      >
        <Text className="font-label text-base text-onEmber">{initial}</Text>
      </Pressable>
      {open ? (
        <View className="absolute right-0 top-14 z-50 w-64 rounded-3xl border border-line bg-card p-2">
          <MenuRow
            label={copy.settings}
            onPress={() => {
              onClose();
              router.push("/settings" as Href);
            }}
          />
          <MenuRow
            label={copy.guide}
            onPress={() => {
              onClose();
              router.push("/guide");
            }}
          />
          <MenuRow
            label={copy.navPro}
            onPress={() => {
              onClose();
              router.push("/paywall");
            }}
          />
          {session.user.role === "admin" ? (
            <MenuRow
              label={copy.admin}
              onPress={() => {
                onClose();
                router.push("/admin");
              }}
            />
          ) : null}
          {confirmOut ? (
            <View className="px-4 py-3">
              <Text className="text-sm leading-5 text-muted">{copy.confirmSignOut}</Text>
              <View className="mt-3 flex-row gap-2">
                <MenuRow
                  label={copy.cancel}
                  onPress={() => setConfirmOut(false)}
                />
                <MenuRow
                  label={copy.signOutNow}
                  onPress={() => {
                    onClose();
                    setConfirmOut(false);
                    void signOut().finally(() => {
                      clearLocalProgress();
                      router.replace("/account");
                    });
                  }}
                />
              </View>
            </View>
          ) : (
            <MenuRow label={copy.signOut} onPress={() => setConfirmOut(true)} />
          )}
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
        <Pressable accessibilityRole="button" accessibilityLabel={copy.closeMenu} onPress={onClose} className="min-h-12 min-w-12 cursor-pointer items-center justify-center">
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
