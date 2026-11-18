import React from "react";
import { View } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { useCopy } from "@/lib/i18n";

export interface WelcomeStepProps {
  onBegin: () => void;
}

export function WelcomeStep({ onBegin }: WelcomeStepProps) {
  const copy = useCopy();

  return (
    <View
      testID="onboarding-welcome"
      className="w-full max-w-xl mx-auto my-6"
    >
      <View className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_0_#CBD5E1] flex flex-col gap-6">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <span>⏳</span>
            <span>20 Minutos Diários</span>
          </div>
          <span className="text-xs font-semibold text-stone-400">Método Polímata</span>
        </div>

        {/* Title & Introduction */}
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {copy.startWelcomeTitle ?? "Hoje você tem vinte minutos."}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {copy.startWelcomeBody ??
              "A Prosa não é um curso infinito de decoreba. É uma história imersiva por dia, no idioma que você estuda, destrinchada em português através do método polímata de transferência sintática direta."}
          </p>
        </div>

        {/* Council Preview */}
        <div className="p-4 rounded-2xl bg-[#F5F0E8] border border-stone-200/90 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Seu Conselho de Sábios
            </span>
          </div>
          <p className="font-serif italic text-xs sm:text-sm text-stone-800 leading-relaxed">
            “Einstein lê e explica a física do idioma. Curie organiza sua memória de longo prazo (FSRS). Feynman estimula sua fala ativa, e Leonardo da Vinci conduz seu caderno de reconstrução.”
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            label={copy.startBegin ?? "Começar pelo começo"}
            variant="primary"
            size="lg"
            onPress={onBegin}
            testID="onboarding-begin"
            fullWidth
          />
        </div>
      </View>
    </View>
  );
}
