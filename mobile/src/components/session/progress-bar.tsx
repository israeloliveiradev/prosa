import { Text, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { mindForPhase, mindCopy } from "@/lib/cast";
import { getLocale } from "@/lib/i18n";
import { keepWords } from "@/lib/text";
import { PHASES, SESSION_SECONDS, formatClock, phaseForElapsed } from "@/lib/lesson";

export function ProgressBar({ elapsed }: { elapsed: number }) {
  const ratio = Math.max(0, Math.min(1, elapsed / SESSION_SECONDS));
  const locale = getLocale();
  const mind = mindForPhase(phaseForElapsed(elapsed));
  const text = mindCopy(mind, locale);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: SESSION_SECONDS, now: elapsed }}>
      <View className="flex-row items-end justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className="font-label text-xs uppercase tracking-widest text-muted">{keepWords(text.role)}</Text>
          <Text className="font-displayItalic mt-1 text-3xl text-ink">{mind.name}</Text>
          <Text className="mt-3 font-label text-base text-ink" style={{ fontVariant: ["tabular-nums"] }}>
            {formatClock(elapsed)}
            <Text className="text-muted"> / {formatClock(SESSION_SECONDS)}</Text>
          </Text>
        </View>
        <Figure who={mind.id} size={84} />
      </View>
      <View className="mt-4 h-1 overflow-hidden rounded-full bg-line">
        <View className="h-full rounded-full bg-ember" style={{ width: `${ratio * 100}%` }} />
      </View>
      <View className="mt-3 flex-row">
        {PHASES.map((phase, index) => {
          const end = PHASES[index + 1]?.start ?? SESSION_SECONDS;
          const active = elapsed >= phase.start && elapsed < end;
          return (
            <Text key={phase.id} className={`flex-1 font-label text-xs uppercase tracking-widest ${active ? "text-ink" : "text-muted"}`}>
              {phase.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
