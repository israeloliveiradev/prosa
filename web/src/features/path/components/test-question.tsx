import { Platform, Pressable, Text, View } from "react-native";
import type { PathTestItem } from "@/api/schemas/path";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";
import { useListeningClip } from "@/features/placement/hooks/use-listening-clip";
import type { PathCopy } from "@/lib/copy/path";
import { skillLabel, Tag } from "./path-parts";

export interface TestQuestionProps {
  t: PathCopy;
  item: PathTestItem;
  number: number;
  total: number;
  targetLang: string;
  picked: number | null;
  disabled: boolean;
  onPick: (choice: number) => void;
}

/** Uma pergunta do teste: enunciado (texto ou áudio, se houver) e as opções táteis. */
export function TestQuestion({ t, item, number, total, targetLang, picked, disabled, onPick }: TestQuestionProps) {
  const listening = Boolean(item.audio_text);
  const clip = useListeningClip(listening ? (item.audio_text ?? undefined) : undefined, targetLang);
  const skill = skillLabel(item.skill, t);
  const listenLabel = clip.state === "loading" ? t.listenLoading : clip.played ? t.listenAgain : t.listen;

  return (
    <View testID="path-test-question" style={{ gap: 16 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text testID="path-test-number" style={{ fontFamily: tactile.font, fontSize: 17, fontWeight: "800", color: tactile.ink }}>
            {t.questionOf(number, total)}
          </Text>
          {skill ? <Tag label={skill} tone="teal" /> : null}
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: number }}
          style={{ height: 10, borderRadius: 999, overflow: "hidden", backgroundColor: tactile.raised, borderWidth: 1, borderColor: tactile.border }}
        >
          <View style={{ width: `${Math.round((number / Math.max(1, total)) * 100)}%`, height: "100%", borderRadius: 999, backgroundColor: tactile.primary }} />
        </View>
      </View>

      <View style={{ gap: 14, padding: 20, borderRadius: 20, borderWidth: 1.5, borderColor: tactile.border, backgroundColor: tactile.surface, boxShadow: `0 4px 0 ${tactile.border}` } as object}>
        {item.hint || item.format ? (
          <Text testID="path-test-instruction" style={{ fontFamily: tactile.font, fontSize: 13, lineHeight: 19, color: tactile.muted }}>
            {item.hint ?? (item.format === "meaning" ? t.testMeaningHint : t.testClozeHint)}
          </Text>
        ) : null}
        {item.passage ? (
          <View style={{ padding: 14, borderRadius: 14, backgroundColor: tactile.bg, borderWidth: 1, borderColor: tactile.border }}>
            <Text style={{ fontFamily: tactile.serif, fontSize: 18, lineHeight: 28, color: tactile.ink }}>{item.passage}</Text>
          </View>
        ) : null}
        {listening ? (
          <View style={{ gap: 6, alignItems: "flex-start" }}>
            <TactileButton
              testID="path-test-listen"
              variant={clip.state === "playing" ? "primary" : "secondary"}
              size="md"
              label={listenLabel}
              disabled={clip.state === "loading"}
              onPress={() => void clip.play()}
              icon={<TactileIcon name="headphones" size={16} color={clip.state === "playing" ? "#FFFFFF" : tactile.primaryInk} />}
            />
            {clip.state === "error" ? (
              <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.danger }}>
                {t.listenFailed}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text testID="path-test-prompt" style={{ fontFamily: tactile.font, fontSize: 20, lineHeight: 28, fontWeight: "800", color: tactile.ink }}>
          {item.prompt}
        </Text>

        <View accessibilityRole="radiogroup" accessibilityLabel={t.optionsLabel} style={{ gap: 10 }}>
          {item.options.map((option, index) => {
            const selected = picked === index;
            return (
              <Pressable
                key={`${item.id}-${index}`}
                testID={`path-test-option-${index}`}
                accessibilityRole="radio"
                accessibilityLabel={option}
                accessibilityState={{ selected, checked: selected, disabled }}
                aria-checked={selected}
                disabled={disabled}
                onPress={() => onPick(index)}
                style={{
                  minHeight: 54,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: selected ? tactile.primary : tactile.border,
                  backgroundColor: selected ? "#F0FDFA" : tactile.surface,
                  boxShadow: `0 4px 0 ${selected ? tactile.primaryDark : tactile.border}`,
                  ...(Platform.OS === "web" ? { cursor: disabled ? "default" : "pointer" } : {}),
                } as object}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? tactile.primary : tactile.raised,
                    borderWidth: 2,
                    borderColor: selected ? tactile.primaryDark : tactile.borderStrong,
                  }}
                >
                  <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "800", color: selected ? "#FFFFFF" : tactile.muted }}>{index + 1}</Text>
                </View>
                <Text style={{ flex: 1, minWidth: 0, fontFamily: tactile.serif, fontSize: 18, lineHeight: 25, color: tactile.ink }}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
