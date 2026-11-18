import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/shell/icon";
import { Button } from "@/components/ui/button";
import { ProgressBar, type ProgressSegment } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { useTheme } from "@/theme/ThemeContext";

export interface FocusShellProps {
  children: ReactNode;
  progressValue?: number; // 0 a 1
  progressSegments?: ProgressSegment[];
  headerRight?: ReactNode;
  onClose?: () => void;
  confirmExit?: boolean;
  footer?: ReactNode;
  // Feedback bar state
  feedback?: {
    tone: "success" | "danger";
    title: string;
    detail?: string;
  } | null;
  onContinue?: () => void;
  continueText?: string;
  className?: string;
}

export function FocusShell({
  children,
  progressValue,
  progressSegments,
  headerRight,
  onClose,
  confirmExit = true,
  footer,
  feedback,
  onContinue,
  continueText = "Continuar",
  className = "",
}: FocusShellProps) {
  const { palette } = useTheme();
  const [exitModalOpen, setExitModalOpen] = useState(false);

  function handleCloseRequest() {
    if (confirmExit) {
      if (Platform.OS === "web") {
        setExitModalOpen(true);
      } else {
        Alert.alert(
          "Deseja sair da sessão?",
          "O progresso da lição atual não será salvo.",
          [
            { text: "Continuar na lição", style: "cancel" },
            {
              text: "Sair",
              style: "destructive",
              onPress: () => {
                if (onClose) onClose();
                else router.back();
              },
            },
          ]
        );
      }
    } else {
      if (onClose) onClose();
      else router.back();
    }
  }

  function confirmExitAction() {
    setExitModalOpen(false);
    if (onClose) onClose();
    else router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "bottom", "left", "right"]}>
      {/* 1. Barra Superior Compacta */}
      <View className="h-16 px-4 lg:px-8 border-b border-line bg-card flex-row items-center justify-between gap-4 select-none">
        {/* Botão Fechar */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar e sair da sessão"
          onPress={handleCloseRequest}
          className="w-10 h-10 items-center justify-center rounded-full hover:bg-sunken cursor-pointer"
        >
          <Icon name="x" color={palette.onSurfaceVariant} size={22} />
        </Pressable>

        {/* Barra de Progresso Central */}
        <View className="flex-1 max-w-xl px-2">
          {progressSegments ? (
            <ProgressBar segments={progressSegments} tone="primary" size="md" />
          ) : (
            <ProgressBar value={progressValue ?? 0} tone="primary" size="md" />
          )}
        </View>

        {/* Direita: XP, tempo ou menu */}
        <View className="flex-row items-center gap-2 min-w-[40px] justify-end">
          {headerRight}
        </View>
      </View>

      {/* 2. Conteúdo Central de Aprendizado (máx 720px) */}
      <View className="flex-1 min-h-0 flex-col items-center justify-center">
        <View className={`w-full max-w-[720px] flex-1 px-4 py-6 md:px-8 overflow-y-auto ${className}`}>
          {children}
        </View>
      </View>

      {/* 3. Rodapé Fixo de Ação e Feedback */}
      {feedback ? (
        <View
          className={`w-full p-4 md:p-6 border-t select-none transition-all ${
            feedback.tone === "success"
              ? "bg-successSoft border-success/30"
              : "bg-dangerSoft border-danger/30"
          }`}
        >
          <View className="max-w-[720px] mx-auto w-full flex-col md:flex-row md:items-center md:justify-between gap-4">
            <View className="flex-row items-center gap-3">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  feedback.tone === "success" ? "bg-success" : "bg-danger"
                }`}
              >
                <Icon
                  name={feedback.tone === "success" ? "check" : "x"}
                  color="#FFFFFF"
                  size={24}
                />
              </View>
              <View>
                <Text
                  className={`font-display text-xl font-bold ${
                    feedback.tone === "success" ? "text-success" : "text-danger"
                  }`}
                >
                  {feedback.title}
                </Text>
                {feedback.detail ? (
                  <Text className="text-sm text-ink mt-0.5 leading-5">{feedback.detail}</Text>
                ) : null}
              </View>
            </View>

            <Button
              variant={feedback.tone === "success" ? "success" : "danger"}
              size="lg"
              onPress={onContinue}
              className="w-full md:w-auto min-w-[160px]"
            >
              {continueText}
            </Button>
          </View>
        </View>
      ) : footer ? (
        <View className="w-full border-t border-line bg-card p-4 md:p-6 select-none">
          <View className="max-w-[720px] mx-auto w-full">{footer}</View>
        </View>
      ) : null}

      {/* Modal de confirmação de saída (Web) */}
      <Sheet
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        title="Deseja sair da lição?"
        footer={
          <View className="flex-row gap-3 justify-end">
            <Button variant="secondary" onPress={() => setExitModalOpen(false)}>
              Continuar Estudando
            </Button>
            <Button variant="danger" onPress={confirmExitAction}>
              Sair Agora
            </Button>
          </View>
        }
      >
        <Text className="text-base text-muted leading-6">
          Ao sair agora, o progresso da lição de hoje não será contabilizado e a sua ofensiva pode ser impactada.
        </Text>
      </Sheet>
    </SafeAreaView>
  );
}
