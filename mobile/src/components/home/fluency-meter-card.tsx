import React from "react";
import { Text, View, Pressable } from "react-native";
import { tap } from "@/lib/haptics";
import { type Fluency360Status, getAllMilestones } from "@/services/fluency-360";

interface FluencyMeterCardProps {
  status: Fluency360Status | null;
  durationMode: "lite_20" | "pro_40" | "sprint_60";
  onChangeDurationMode?: (mode: "lite_20" | "pro_40" | "sprint_60") => void;
  onPressDetails?: () => void;
}

export function FluencyMeterCard({
  status,
  durationMode,
  onChangeDurationMode,
  onPressDetails,
}: FluencyMeterCardProps) {
  const hours = status?.totalActiveHours ?? 0;
  const remaining = status?.remainingHours ?? 360;
  const percent = status?.progressPercent ?? 0;
  const cefr = status?.cefrLevel ?? "A1 (Discovery)";
  const estDate = status?.estimatedCompletionDate ?? "---";
  const weeklyVelocity = status?.weeklyVelocityHours ?? 3.5;

  const milestones = getAllMilestones(hours);
  const nextMilestone = status?.nextMilestoneHours ?? 30;

  return (
    <View className="rounded-3xl border border-line bg-card p-6 shadow-sm">
      {/* Header Badge & Title */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Text className="text-xl">⏳</Text>
          </View>
          <View>
            <Text className="text-xs font-bold uppercase tracking-widest text-amber-500">
              Cronômetro de Fluência
            </Text>
            <Text className="text-lg font-extrabold text-ink">360H Engine</Text>
          </View>
        </View>

        <View className="rounded-full bg-amber-500/10 px-3.5 py-1.5 border border-amber-500/30">
          <Text className="text-xs font-extrabold text-amber-500">{cefr}</Text>
        </View>
      </View>

      {/* Main Countdown Meter */}
      <View className="mb-5 rounded-2xl bg-canvas p-5 border border-line/80">
        <View className="flex-row items-baseline justify-between mb-2">
          <View className="flex-row items-baseline gap-2">
            <Text className="text-4xl font-extrabold tracking-tight text-ink">
              {remaining.toFixed(1)}h
            </Text>
            <Text className="text-xs font-semibold text-muted">restantes</Text>
          </View>
          <Text className="text-xs font-bold text-muted">
            {hours.toFixed(1)}h acumuladas / 360h
          </Text>
        </View>

        {/* Progress Bar (Duolingo Style Gradient Amber/Emerald) */}
        <View className="h-3.5 w-full overflow-hidden rounded-full bg-line/60">
          <View
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </View>

        <View className="mt-2.5 flex-row items-center justify-between">
          <Text className="text-xs font-bold text-muted">
            {percent.toFixed(1)}% concluído
          </Text>
          <Text className="text-xs font-extrabold text-amber-500">
            Próximo marco: {nextMilestone}h 🎯
          </Text>
        </View>
      </View>

      {/* Velocity & Completion Projection */}
      <View className="flex-row items-center justify-between border-t border-line/60 pt-4 mb-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-medium text-muted">Ritmo Atual:</Text>
          <Text className="text-xs font-extrabold text-ink">{weeklyVelocity}h / semana</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-medium text-muted">Previsão B2:</Text>
          <Text className="text-xs font-extrabold text-emerald-500">
            {estDate}
          </Text>
        </View>
      </View>

      {/* 30h Milestones Chips */}
      <View className="mb-4 flex-row flex-wrap gap-2">
        {milestones.slice(0, 6).map((m) => (
          <View
            key={`m_${m.hours}`}
            className={`rounded-xl px-3 py-1.5 border ${
              m.unlocked
                ? "bg-amber-500/15 border-amber-500/40"
                : "bg-canvas border-line/50 opacity-60"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                m.unlocked ? "text-amber-500" : "text-muted"
              }`}
            >
              {m.unlocked ? "✓ " : ""}{m.hours}h
            </Text>
          </View>
        ))}
      </View>

      {/* Session Duration Switcher */}
      {onChangeDurationMode && (
        <View className="border-t border-line/60 pt-4">
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
            Sessão Diária Recomendada:
          </Text>
          <View className="flex-row gap-2.5">
            {[
              { id: "lite_20" as const, name: "20 min", sub: "Lite" },
              { id: "pro_40" as const, name: "40 min", sub: "Pro" },
              { id: "sprint_60" as const, name: "60 min", sub: "Sprint" },
            ].map((item) => {
              const active = durationMode === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onChangeDurationMode(item.id);
                    void tap("light");
                  }}
                  className={`flex-1 rounded-2xl p-3 border items-center min-h-16 justify-center ${
                    active
                      ? "bg-emerald-500/10 border-emerald-500 shadow-sm"
                      : "bg-canvas border-line active:bg-cardHover"
                  }`}
                >
                  <Text className={`text-sm font-extrabold ${active ? "text-emerald-500" : "text-ink"}`}>
                    {item.name}
                  </Text>
                  <Text className="text-[11px] font-semibold text-muted">{item.sub}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
