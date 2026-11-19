import React from "react";
import { View, Image, Platform } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Pill } from "@/ui/pill";
import { useCopy } from "@/lib/i18n";

export interface ReadyStepProps {
  level: string;
  onOpenProse: () => void;
  onRestart?: () => void;
}

export function ReadyStep({ level, onOpenProse, onRestart }: ReadyStepProps) {
  const copy = useCopy();

  const bodyText = (copy.startReadyBody ?? "Você está no nível {level}. Einstein abre a história, Curie prepara suas cartas e Da Vinci orienta sua sintaxe. Vinte minutos diários, quando você quiser.").replace(
    "{level}",
    level,
  );

  return (
    <View
      testID="onboarding-ready"
      className="w-full max-w-xl mx-auto my-6"
    >
      <View className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_0_#CBD5E1] flex flex-col gap-6">
        {/* Top Badges & Level Indicator */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <span>✨</span>
            <span>Trilha Personalizada Pronta</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Nível</span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300 shadow-sm">
              {level}
            </span>
          </div>
        </div>

        {/* Mentor Greeting Card */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#F5F0E8] border border-stone-200/90">
          <div className="relative shrink-0 w-16 h-16">
            <div className="w-full h-full rounded-2xl overflow-hidden bg-[#0D9488]/15 border border-[#0D9488]/30 shadow-sm flex items-center justify-center">
              <img
                src="/cast/einstein.png"
                alt="Albert Einstein"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.dataset.tried) {
                    target.dataset.tried = "1";
                    target.src = "/assets/assets/cast/einstein.png";
                  } else if (target.dataset.tried === "1") {
                    target.dataset.tried = "2";
                    target.src = "/assets/images/einstein-reading.jpg";
                  } else {
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="font-bold text-teal-800 text-lg">AE</span>';
                    }
                  }
                }}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">
              P
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-extrabold text-stone-900">Albert Einstein</span>
              <span className="text-[10px] text-stone-500 font-medium">• Mentor Polímata</span>
            </div>
            <p className="font-serif italic text-xs sm:text-sm text-stone-800 leading-relaxed">
              “{copy.startReadyTitle ?? "A prosa de hoje já tem dono."} O tempo é relativo, mas 20 minutos de imersão diária focada dobram sua retenção sináptica.”
            </p>
          </div>
        </div>

        {/* Ritual Breakdown: 4 Pillars */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 mb-3">
            Seu Ritual de 20 Minutos de Hoje
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-lg">🧠</span>
              <div>
                <p className="text-xs font-bold text-stone-800">1. Cartas FSRS</p>
                <p className="text-[11px] text-stone-500">Revisão ativa com Curie (5 min)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-lg">🎧</span>
              <div>
                <p className="text-xs font-bold text-stone-800">2. Áudio &amp; Ritmo</p>
                <p className="text-[11px] text-stone-500">Imersão auditiva nativa (5 min)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-lg">📖</span>
              <div>
                <p className="text-xs font-bold text-stone-800">3. Sintaxe</p>
                <p className="text-[11px] text-stone-500">Einstein disseca estruturas (5 min)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-lg">✍️</span>
              <div>
                <p className="text-xs font-bold text-stone-800">4. Cadência &amp; Reconstrução</p>
                <p className="text-[11px] text-stone-500">Desafios de Leonardo (5 min)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Note */}
        <p className="text-xs text-stone-600 leading-relaxed">
          {bodyText}
        </p>

        {/* Tactile Action Button */}
        <div className="pt-2 flex flex-col gap-2">
          <Button
            label={copy.startFirstProse ?? "Começar a primeira prosa"}
            variant="primary"
            size="lg"
            onPress={onOpenProse}
            testID="onboarding-open-prose"
            fullWidth
          />
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors text-center w-full cursor-pointer"
            >
              ← Refazer escolhas ou trocar idioma
            </button>
          )}
        </div>
      </View>
    </View>
  );
}
