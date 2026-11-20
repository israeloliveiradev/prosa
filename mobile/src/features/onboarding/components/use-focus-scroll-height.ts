import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "@/ui/hooks/use-breakpoint";

/** Barra superior do FocusShell (64) + a borda inferior dela. */
const FOCUS_HEADER = 65;
/** Respiro vertical que o FocusShell põe em volta do conteúdo (topo + base). */
const FOCUS_PADDING = { desktop: 64, compact: 32 } as const;

/**
 * Altura máxima da rolagem dentro do FocusShell. O shell centraliza o conteúdo
 * numa área de altura fixa; sem limite, um passo mais alto que a tela (plano,
 * editor) transborda para cima e para baixo e não rola. `extra` desconta um
 * rodapé do shell.
 */
export function useFocusScrollHeight(extra = 0): number {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useBreakpoint();
  const padding = isDesktopOrLaptop ? FOCUS_PADDING.desktop : FOCUS_PADDING.compact;
  return Math.max(240, Math.floor(height - FOCUS_HEADER - padding - insets.top - insets.bottom - extra));
}
