import { createContext, useContext, type ReactNode } from "react";
import { Platform, ScrollView, View, useWindowDimensions } from "react-native";
import { usePathname, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CourseSwitcher } from "@/features/course/components/course-switcher";
import { useTodayPlan } from "@/features/home/model/use-today-plan";
import { isActivePath, shellLayoutFor, type ShellLayout } from "@/features/shell/model/shell-model";
import { NavItem } from "@/features/shell/nav-item";
import { ProgressChips } from "@/features/shell/progress-chips";
import { TodayButton } from "@/features/shell/today-button";
import { UserMenu } from "@/features/shell/user-menu";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";
import { PRIMARY_NAV_ITEMS } from "@/navigation/nav-items";
import { TactileLogo } from "./tactile-logo";
import { tactile } from "./tokens";

export interface AppShellProps {
  children: ReactNode;
}

const InsideShell = createContext(false);

const SIDEBAR_WIDE = 256;
const SIDEBAR_RAIL = 96;
const TAB_BAR = 64;
const isWeb = Platform.OS === "web";

/**
 * Shell do aplicativo com os 5 destinos (Hoje, Trilha, Leitura, Conversa, Você).
 * - ≥ 1024 px: barra lateral com o botão da sessão de hoje;
 * - 768–1023 px: trilho estreito com ícones;
 * - < 768 px: abas embaixo.
 * Cabeçalho: seletor de curso, ofensiva e XP reais (useToday) e o menu da conta.
 * Uma tela que ainda se embrulha no AppShell dentro do grupo (app) não ganha um segundo shell.
 */
export function AppShell({ children }: AppShellProps) {
  const nested = useContext(InsideShell);
  if (nested) {
    return <>{children}</>;
  }
  return <ShellFrame>{children}</ShellFrame>;
}

function ShellFrame({ children }: AppShellProps) {
  const { width } = useWindowDimensions();
  const layout = shellLayoutFor(width);
  const insets = useSafeAreaInsets();
  const plan = useTodayPlan();

  return (
    <InsideShell.Provider value={true}>
      <View
        testID="app-shell"
        style={{
          flex: 1,
          flexDirection: layout === "phone" ? "column" : "row",
          backgroundColor: tactile.bg,
          width: "100%",
          ...(isWeb ? { minHeight: "100dvh" } : {}),
        } as object}
      >
        {layout === "phone" ? null : <Sidebar layout={layout} plan={plan} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Header layout={layout} plan={plan} topInset={insets.top} />
          <View
            testID="app-shell-content"
            style={{
              flex: 1,
              minWidth: 0,
              paddingBottom: layout === "phone" ? TAB_BAR + insets.bottom : 0,
              ...(isWeb ? { overflowX: "clip" } : {}),
            } as object}
          >
            {children}
          </View>
        </View>
        {layout === "phone" ? <TabBar bottomInset={insets.bottom} /> : null}
      </View>
    </InsideShell.Provider>
  );
}

type Plan = ReturnType<typeof useTodayPlan>;

function useNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useAreaCopy(SHELL_COPY);
  return {
    t,
    items: PRIMARY_NAV_ITEMS.map((item) => ({
      ...item,
      label: t[item.labelKey],
      active: isActivePath(pathname, item.path),
      go: () => router.push(item.path as Href),
    })),
    goHome: () => router.push("/"),
  };
}

function Sidebar({ layout, plan }: { layout: Exclude<ShellLayout, "phone">; plan: Plan }) {
  const { t, items, goHome } = useNav();
  const rail = layout === "rail";
  return (
    <View
      testID="app-sidebar"
      style={{
        width: rail ? SIDEBAR_RAIL : SIDEBAR_WIDE,
        flexShrink: 0,
        borderRightWidth: 1,
        borderRightColor: tactile.border,
        backgroundColor: tactile.surface,
        boxShadow: `4px 0 0 ${tactile.raised}`,
        zIndex: 20,
        ...(isWeb ? { position: "sticky", top: 0, height: "100dvh", alignSelf: "flex-start" } : {}),
      } as object}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 20, paddingHorizontal: rail ? 10 : 16, gap: 22 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: rail ? "center" : "flex-start", paddingHorizontal: rail ? 0 : 4 }}>
          <TactileLogo size={rail ? 40 : 38} showWordmark={!rail} onPress={goHome} accessibilityLabel={t.logoHome} />
        </View>

        <TodayButton status={plan.status} minutes={plan.minutes} compact={rail} />

        <View {...({ role: "navigation" } as object)} aria-label={t.mainNav} style={{ gap: 6 }}>
          {items.map((item) => (
            <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} active={item.active} onPress={item.go} variant={rail ? "rail" : "wide"} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ layout, plan, topInset }: { layout: ShellLayout; plan: Plan; topInset: number }) {
  const { t, goHome } = useNav();
  const phone = layout === "phone";
  const narrow = useWindowDimensions().width < 370;
  return (
    <View
      testID="app-header"
      style={{
        paddingTop: topInset,
        backgroundColor: "rgba(253,251,247,0.94)",
        borderBottomWidth: 1,
        borderBottomColor: tactile.border,
        zIndex: 15,
        ...(isWeb ? { position: "sticky", top: 0, backdropFilter: "blur(10px)" } : {}),
      } as object}
    >
      <View
        style={{
          height: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: phone ? 8 : 12,
          paddingHorizontal: phone ? 12 : 24,
          width: "100%",
          maxWidth: 1180,
          marginHorizontal: "auto",
        } as object}
      >
        {phone ? <TactileLogo size={32} showWordmark={false} onPress={goHome} accessibilityLabel={t.logoHome} /> : null}
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <CourseSwitcher compact={phone} />
        </View>
        <View style={{ flex: 1 }} />
        <ProgressChips snapshot={plan.snapshot} compact={narrow} />
        <UserMenu />
      </View>
    </View>
  );
}

function TabBar({ bottomInset }: { bottomInset: number }) {
  const { t, items } = useNav();
  return (
    <View
      testID="app-tabbar"
      accessibilityRole="tablist"
      aria-label={t.mainNav}
      style={{
        position: isWeb ? "fixed" : "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: TAB_BAR + bottomInset,
        paddingBottom: bottomInset,
        paddingHorizontal: 4,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: tactile.surface,
        borderTopWidth: 1,
        borderTopColor: tactile.border,
        boxShadow: `0 -3px 0 ${tactile.raised}`,
        zIndex: 30,
      } as object}
    >
      {items.map((item) => (
        <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} active={item.active} onPress={item.go} variant="tab" />
      ))}
    </View>
  );
}
