import { useState, type ReactNode } from "react";
import { View, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { IconButton } from "@/ui/icon-button";
import { Dialog } from "@/ui/dialog";
import { Progress } from "@/ui/progress";
import { useBreakpoint } from "@/ui/hooks/use-breakpoint";
import { radius } from "@/design/tokens";
import { Logo } from "@/components/shell/logo";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";

export interface FocusShellProps {
  children: ReactNode;
  progressValue?: number; // 0 a 1
  headerCenter?: ReactNode;
  headerRight?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  confirmExit?: boolean;
  exitTitle?: string;
  exitMessage?: string;
  footer?: ReactNode;
  testID?: string;
}

export function FocusShell({
  children,
  progressValue,
  headerCenter,
  headerRight,
  onBack,
  onClose,
  confirmExit = true,
  exitTitle,
  exitMessage,
  footer,
  testID = "focus-shell",
}: FocusShellProps) {
  const { palette } = useTheme();
  const t = useAreaCopy(SHELL_COPY);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useBreakpoint();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  const handleClose = () => {
    if (confirmExit) {
      setExitDialogOpen(true);
    } else {
      if (onClose) onClose();
      else router.back();
    }
  };

  const handleConfirmExit = () => {
    setExitDialogOpen(false);
    if (onClose) onClose();
    else router.back();
  };

  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        backgroundColor: isDesktopOrLaptop ? palette.frame : palette.sheet,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        ...(Platform.OS === "web" ? { minHeight: "100dvh" as any } : {}),
      }}
    >
      {/* Barra Superior Focada */}
      <View
        style={{
          height: 64,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
          backgroundColor: palette.sheet,
          justifyContent: "center",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 960,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Lado esquerdo: Botão Voltar ou Fechar + Emblema Oficial Prosa */}
          <View style={{ minWidth: 44, flexDirection: "row", alignItems: "center", gap: 12 }}>
            {onBack ? (
              <IconButton
                icon="chevron-left"
                variant="ghost"
                size="md"
                accessibilityLabel={t.focusBack}
                onPress={onBack}
                testID="focus-shell-back"
              />
            ) : onClose ? (
              <IconButton
                icon="x"
                variant="ghost"
                size="md"
                accessibilityLabel={t.focusClose}
                onPress={handleClose}
                testID="focus-shell-close"
              />
            ) : null}
            <Logo compact />
          </View>

          {/* Centro: Progresso ou régua */}
          <View style={{ flex: 1, maxWidth: 440, marginHorizontal: 8 }}>
            {headerCenter ? (
              headerCenter
            ) : progressValue !== undefined ? (
              <Progress value={progressValue} aria-label={t.focusProgress} />
            ) : null}
          </View>

          {/* Lado direito: Ações adicionais e/ou Fechar (quando Voltar está à esquerda) */}
          <View style={{ minWidth: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            {headerRight}
            {onBack && onClose ? (
              <IconButton
                icon="x"
                variant="ghost"
                size="md"
                accessibilityLabel={t.focusClose}
                onPress={handleClose}
                testID="focus-shell-close"
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* Conteúdo Central Adaptativo */}
      <View
        style={{
          flex: 1,
          width: "100%",
          paddingHorizontal: isDesktopOrLaptop ? 24 : 16,
          paddingVertical: isDesktopOrLaptop ? 32 : 16,
          justifyContent: isDesktopOrLaptop ? "center" : "flex-start",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: isDesktopOrLaptop ? 740 : 640,
            flex: isDesktopOrLaptop ? undefined : 1,
            backgroundColor: "transparent",
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: isDesktopOrLaptop ? radius.sheet : 0,
            paddingHorizontal: 0,
            paddingVertical: 0,
          }}
        >
          {children}
        </View>
      </View>

      {/* Rodapé opcional */}
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: palette.sheet,
          }}
        >
          <View style={{ width: "100%", maxWidth: 960, alignSelf: "center" }}>
            {footer}
          </View>
        </View>
      ) : null}

      {/* Diálogo de confirmação de saída */}
      <Dialog
        visible={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        title={exitTitle ?? t.focusExitTitle}
        description={exitMessage ?? t.focusExitMessage}
        tone="negative"
        confirmAction={{
          label: t.focusExitConfirm,
          onPress: handleConfirmExit,
          variant: "primary",
          tone: "negative",
        }}
        cancelAction={{
          label: t.focusExitCancel,
          onPress: () => setExitDialogOpen(false),
          variant: "secondary",
        }}
        testID="focus-exit-dialog"
      />
    </View>
  );
}
