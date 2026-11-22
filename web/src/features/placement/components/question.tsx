import { Platform, Pressable, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import type { PlacementAttempt, PlacementItem, PlacementSkill } from "@/api/schemas/placement";
import { fillCopy, percent, type PlacementErrorKind } from "@/features/placement/model/placement-flow";
import { useListeningClip } from "@/features/placement/hooks/use-listening-clip";
import type { PlacementCopy } from "@/lib/copy/placement";
import { Chip, PlacementNotice } from "./parts";

export function skillLabel(t: PlacementCopy, skill: PlacementSkill): string {
  if (skill === "vocab") {
    return t.skillVocab;
  }
  if (skill === "grammar") {
    return t.skillGrammar;
  }
  if (skill === "listening") {
    return t.skillListening;
  }
  return t.skillReading;
}

export interface QuestionProps {
  t: PlacementCopy;
  attempt: PlacementAttempt;
  item: PlacementItem;
  targetLang: string;
  picked: number | null;
  pending: boolean;
  error: PlacementErrorKind | null;
  onPick: (choice: number) => void;
  onSubmit: () => void;
  onLeave?: () => void;
}

/** Uma pergunta do motor: enunciado, texto ou áudio, quatro opções e o envio. */
export function Question({ t, attempt, item, targetLang, picked, pending, error, onPick, onSubmit, onLeave }: QuestionProps) {
  const number = attempt.index + 1;
  const fixedTotal = attempt.adaptive ? null : attempt.items.length;
  const cap = attempt.cap;
  const listening = item.kind === "listening" && Boolean(item.audio_text);
  const clip = useListeningClip(listening ? item.audio_text : undefined, targetLang);

  const listenLabel =
    clip.state === "loading" ? t.listenLoading : clip.state === "playing" ? t.listenPlaying : clip.played ? t.listenAgain : t.listen;

  return (
    <View className="gap-5" testID="placement-question">
      <View className="gap-3">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <Text testID="placement-question-number" className="font-sans text-lg font-black text-[#111C2D]">
            {fixedTotal ? fillCopy(t.questionNofTotal, { n: number, total: fixedTotal }) : fillCopy(t.questionN, { n: number })}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <Chip label={skillLabel(t, item.kind)} tone="teal" />
            <Chip label={fillCopy(t.bandLabel, { band: item.band })} tone="amber" />
          </View>
        </View>
        {fixedTotal ? (
          <View
            className="h-3 overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F5F0E8]"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: fixedTotal, now: number }}
          >
            <View className="h-full rounded-full bg-[#0D9488]" style={{ width: `${percent(number, fixedTotal)}%` }} />
          </View>
        ) : typeof cap === "number" ? (
          <Text className="font-sans text-xs font-semibold text-[#64748B]">{fillCopy(t.adaptiveNote, { cap })}</Text>
        ) : null}
      </View>

      <TactileCard key={item.id} className="p-5 md:p-7" style={{ padding: 24 }}>
        <View className="gap-5">
          {item.hint ? <Text className="font-sans text-sm leading-6 text-[#64748B]">{item.hint}</Text> : null}

          {item.passage ? (
            <View className="rounded-2xl border border-[#E2E8F0] bg-[#FDFBF7] p-4">
              <Text testID="placement-passage" className="font-reading text-lg leading-8 text-[#111C2D]">
                {item.passage}
              </Text>
            </View>
          ) : null}

          {listening ? (
            <View className="gap-2">
              <View className="flex-row flex-wrap items-center gap-3">
                <View testID="placement-play-audio">
                  <TactileButton
                    variant={clip.state === "playing" ? "primary" : "secondary"}
                    size="md"
                    label={listenLabel}
                    disabled={clip.state === "loading"}
                    onPress={() => void clip.play()}
                    icon={<Icon name="speaker" color={clip.state === "playing" ? "#FFFFFF" : "#0F766E"} size={20} />}
                  />
                </View>
              </View>
              {clip.state === "error" ? (
                <Text accessibilityRole="alert" className="font-sans text-sm text-[#B91C1C]">
                  {t.listenFailed}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text testID="placement-prompt" className="font-sans text-xl font-extrabold leading-8 text-[#111C2D]">
            {item.prompt}
          </Text>

          <View accessibilityRole="radiogroup" accessibilityLabel={t.optionsLabel} className="gap-3">
            {item.options.map((option, index) => {
              const selected = picked === index;
              return (
                <Pressable
                  key={`${item.id}-${index}`}
                  testID={`placement-option-${index}`}
                  accessibilityRole="radio"
                  accessibilityLabel={option}
                  accessibilityState={{ selected, checked: selected, disabled: pending }}
                  aria-checked={selected}
                  disabled={pending}
                  onPress={() => onPick(index)}
                  className={`min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                    selected
                      ? "border-[#0D9488] bg-[#F0FDFA] shadow-[0_4px_0_#0F766E]"
                      : "border-[#E2E8F0] bg-white shadow-[0_4px_0_#E2E8F0]"
                  }`}
                  style={Platform.OS === "web" ? ({ cursor: pending ? "default" : "pointer" } as object) : undefined}
                >
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-lg ${selected ? "bg-[#0D9488]" : "bg-[#F5F0E8]"}`}
                    style={{ borderWidth: 2, borderColor: selected ? "#0F766E" : "#CBD5E1" }}
                  >
                    <Text className={`font-sans text-sm font-black ${selected ? "text-white" : "text-[#64748B]"}`}>{index + 1}</Text>
                  </View>
                  <Text className="min-w-0 flex-1 font-reading text-lg leading-7 text-[#111C2D]">{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </TactileCard>

      {/* O botão de confirmar reenvia a mesma resposta; o aviso só explica o que falhou. */}
      {error ? <PlacementNotice t={t} kind={error} testID="placement-answer-error" /> : null}

      <View className="flex-row flex-wrap items-center justify-between gap-4">
        {onLeave ? (
          <View className="max-w-xs gap-1">
            <View className="self-start" testID="placement-leave">
              <TactileButton variant="ghost" size="sm" label={t.leave} onPress={onLeave} />
            </View>
            <Text className="px-3 font-sans text-xs text-[#64748B]">{t.leaveNote}</Text>
          </View>
        ) : (
          <View />
        )}
        <View testID="placement-submit-answer">
          <TactileButton
            variant="primary"
            size="lg"
            label={pending ? t.sending : t.confirm}
            disabled={picked === null || pending}
            onPress={onSubmit}
          />
        </View>
      </View>
    </View>
  );
}
