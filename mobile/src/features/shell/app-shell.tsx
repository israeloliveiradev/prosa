import { useState, type ReactNode } from "react";
import { View, Platform, Pressable } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { useBreakpoint } from "@/ui/hooks/use-breakpoint";
import { Logo } from "@/components/shell/logo";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Icon } from "@/ui/icon";
import { Glass } from "@/ui/glass";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/navigation/nav-items";
import { NavItem } from "./nav-item";
import { useSession } from "@/lib/session";
import { useCopy } from "@/lib/i18n";
import { CourseButton } from "@/features/course/components/course-button";
import { CourseSheet } from "@/features/course/components/course-sheet";

export interface AppShellProps {
  children: ReactNode;
  testID?: string;
}

/**
 * AppShell: Shell principal da aplicação autenticada (Início, Prática, Memória, Notícias, Perfil, etc.).
 *
 * Aritmética da grade no Desktop (>= 1024px):
 * - Moldura externa: palette.frame (#F2F5F7 no claro / #101112 no escuro), 100vw x 100dvh
 * - Barra lateral: largura fixa de 228 px, padding 16 px
 * - Folha de trabalho (sheet):
 *   - Margem externa: 8 px no topo, direita e base; recuo lateral de 8 px da sidebar
 *   - Raio de canto: 16 px (radius.sheet)
 *   - Borda: 1 px palette.border (#E8EAEC / #2A2C2F)
 *   - Largura calculada: calc(100vw - 228px - 16px)
 *   - Fundo: palette.sheet (#FFFFFF / #17181A)
 *
 * Aritmética da grade no Celular / Tablet (< 1024px):
 * - Barra superior: 56 px de altura com efeito Glass sobre conteúdo que rola
 * - Barra inferior de abas: 56 px + safe area com efeito Glass e 5 destinos primários
 */
export function AppShell({ children, testID = "app-shell" }: AppShellProps) {
  const { palette } = useTheme();
  const { isDesktopOrLaptop } = useBreakpoint();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const copy = useCopy();

  const isAdmin = session?.user?.role === "admin";
  const [courseSheetVisible, setCourseSheetVisible] = useState(false);

  const copyMap = copy as unknown as Record<string, string>;

  // Destino ativo
  const isPathActive = (itemPath: string) => {
    if (itemPath === "/") {
      return pathname === "/" || pathname === "/index";
    }
    return pathname.startsWith(itemPath);
  };

  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        backgroundColor: palette.frame,
        ...(Platform.OS === "web" ? { height: "100dvh" as any, minHeight: "100dvh" as any } : {}),
      }}
    >
      {isDesktopOrLaptop ? (
        /* Layout Desktop (>= 1024px) */
        <View style={{ flex: 1, flexDirection: "row", overflow: "hidden" }}>
          {/* Sidebar fixa de 228 px */}
          <View
            style={{
              width: 228,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              paddingHorizontal: 12,
              justifyContent: "space-between",
            }}
          >
            {/* Topo da Sidebar: Marca e Ação Principal */}
            <View className="gap-4">
              {/* Marca */}
              <Pressable
                onPress={() => router.push("/")}
                className="flex-row items-center gap-2.5 px-2 py-1 cursor-pointer"
                accessibilityRole="button"
                accessibilityLabel="Ir para o início"
              >
                <Logo compact />
                <Text variant="section" weight="semibold" tone="ink">
                  Prosa
                </Text>
              </Pressable>

              {/* Botão de Destaque: Abrir a Prosa de Hoje */}
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push("/daily")}
                testID="sidebar-open-daily"
                className="w-full"
              >
                Abrir prosa de hoje
              </Button>

              {/* Destinos Primários */}
              <View className="gap-1 mt-2">
                {PRIMARY_NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.id}
                    id={item.id}
                    label={copyMap[item.labelKey] ?? item.defaultLabel}
                    icon={item.icon}
                    active={isPathActive(item.path)}
                    onPress={() => router.push(item.path as any)}
                  />
                ))}
              </View>
            </View>

            {/* Rodapé da Sidebar: Idioma e Utilidades */}
            <View className="gap-2 pt-3 border-t border-rule">
              {/* Seletor de Curso */}
              <CourseButton compact={false} onPress={() => setCourseSheetVisible(true)} />

              {SECONDARY_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
                <NavItem
                  key={item.id}
                  id={item.id}
                  label={copyMap[item.labelKey] ?? item.defaultLabel}
                  icon={item.icon}
                  active={isPathActive(item.path)}
                  onPress={() => router.push(item.path as any)}
                />
              ))}
            </View>
          </View>

          {/* Folha de Trabalho (Sheet) recuada 8 px com raio 16 */}
          <View
            style={{
              flex: 1,
              marginTop: 8,
              marginRight: 8,
              marginBottom: 8,
              borderRadius: radius.sheet,
              backgroundColor: palette.sheet,
              borderColor: palette.border,
              borderWidth: 1,
              overflow: "hidden",
            }}
          >
            {children}
          </View>
        </View>
      ) : (
        /* Layout Celular / Tablet (< 1024px) */
        <View style={{ flex: 1, backgroundColor: palette.sheet }}>
          {/* Barra Superior com Vidro Funcional */}
          <Glass
            style={{
              height: 56 + insets.top,
              paddingTop: insets.top,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
              zIndex: 10,
            }}
          >
            <Pressable
              onPress={() => router.push("/")}
              className="flex-row items-center gap-2 cursor-pointer"
            >
              <Logo compact />
              <Text variant="section" weight="semibold" tone="ink">
                Prosa
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-2">
              <CourseButton compact={true} onPress={() => setCourseSheetVisible(true)} />

              <Pressable
                onPress={() => router.push("/profile")}
                accessibilityRole="button"
                accessibilityLabel="Abrir perfil"
                className="w-8 h-8 rounded-full items-center justify-center cursor-pointer"
                style={{ backgroundColor: palette.raised }}
              >
                <Icon name="user" size={16} tone="muted" />
              </Pressable>
            </View>
          </Glass>

          {/* Área de Conteúdo Central */}
          <View style={{ flex: 1, overflow: "hidden" }}>{children}</View>

          {/* Barra Inferior de Abas com Vidro Funcional */}
          <Glass
            style={{
              height: 56 + insets.bottom,
              paddingBottom: insets.bottom,
              paddingHorizontal: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-around",
              borderTopWidth: 1,
              borderTopColor: palette.border,
              zIndex: 10,
            }}
          >
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isPathActive(item.path);
              return (
                <Pressable
                  key={item.id}
                  testID={`tab-${item.id}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={copyMap[item.labelKey] ?? item.defaultLabel}
                  onPress={() => router.push(item.path as any)}
                  className="flex-1 items-center justify-center py-1 cursor-pointer"
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    strokeWidth={active ? 2 : 1.5}
                    tone={active ? "accent" : "muted"}
                  />
                  <Text
                    variant="small"
                    weight={active ? "medium" : "normal"}
                    tone={active ? "accent" : "muted"}
                    style={{ fontSize: 11, marginTop: 2 }}
                  >
                    {copyMap[item.labelKey] ?? item.defaultLabel}
                  </Text>
                </Pressable>
              );
            })}
          </Glass>
        </View>
      )}

      {/* Folha de seleção e troca de cursos */}
      <CourseSheet
        visible={courseSheetVisible}
        onClose={() => setCourseSheetVisible(false)}
      />
    </View>
  );
}
