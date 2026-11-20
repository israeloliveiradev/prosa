import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { Icon } from "@/components/shell/icon";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import type { PlacementFinish } from "@/api/schemas/placement";
import {
  fillCopy,
  languageLabel,
  levelDelta,
  orderedBands,
} from "@/features/placement/model/placement-flow";
import { canDoFor, canDoText } from "@/lib/can-do";
import type { PlacementCopy } from "@/lib/copy/placement";
import type { DisplayLocale } from "@/lib/i18n";
import { HistoryList } from "./history-list";
import { LevelBadge, SectionLabel } from "./parts";
import { skillLabel } from "./question";
import { ScoreBars } from "./skill-bars";

export interface ResultProps {
  t: PlacementCopy;
  locale: DisplayLocale;
  bcp47: string;
  result: PlacementFinish;
  embedded: boolean;
  onSaveCanDo: (held: string[]) => Promise<void>;
  onDone: () => void;
}

function deltaLine(t: PlacementCopy, result: PlacementFinish): string {
  const delta = levelDelta(result.previous_level, result.level);
  const values = { from: result.previous_level ?? "", to: result.level };
  if (delta === "up") {
    return fillCopy(t.deltaUp, values);
  }
  if (delta === "down") {
    return fillCopy(t.deltaDown, values);
  }
  if (delta === "same") {
    return fillCopy(t.deltaSame, values);
  }
  return t.deltaFirst;
}

/** Resultado: nível medido, mudança, acertos por faixa e por habilidade, "eu consigo" e a saída. */
export function Result({ t, locale, bcp47, result, embedded, onSaveCanDo, onDone }: ResultProps) {
  const language = languageLabel(result.target_lang, bcp47);
  const bands = orderedBands(result.bands).map((band) => ({ key: band.band, label: band.band, correct: band.correct, total: band.total }));
  const skills = result.skills
    .filter((skill) => skill.total > 0)
    .map((skill) => ({ key: skill.skill, label: skillLabel(t, skill.skill), correct: skill.correct, total: skill.total }));

  return (
    <View className="gap-5" testID="placement-result">
      <TactileCard className="p-6" style={{ padding: 24 }}>
        <View className="gap-5">
          <View className="flex-row flex-wrap items-center gap-5">
            <LevelBadge level={result.level} testID="placement-result-level" />
            <View className="min-w-0 flex-1 gap-1">
              <SectionLabel>{t.kicker}</SectionLabel>
              <Text className="font-sans text-2xl font-black text-[#111C2D]">{fillCopy(t.resultTitle, { lang: language })}</Text>
              <Text testID="placement-result-delta" className="font-sans text-base font-bold text-[#0F766E]">
                {deltaLine(t, result)}
              </Text>
            </View>
            <Flag code={result.target_lang} size={40} />
          </View>
          <View className="gap-1">
            <Text className="font-sans text-sm leading-6 text-[#334155]">{fillCopy(t.applied, { lang: language })}</Text>
            <Text testID="placement-result-score" className="font-sans text-sm font-bold text-[#64748B]">
              {fillCopy(t.correctOf, { correct: result.correct, total: result.total })}
            </Text>
          </View>
        </View>
      </TactileCard>

      <View className="flex-col gap-5 md:flex-row" testID="placement-skill-bars">
        <ScoreBars title={t.bandsTitle} rows={bands} t={t} tone="teal" labelWidth={36} testID="placement-band-bars" />
        <ScoreBars title={t.skillsTitle} rows={skills} t={t} tone="amber" testID="placement-skill-rows" />
      </View>

      <CanDoChecklist t={t} locale={locale} level={result.level} onSave={onSaveCanDo} />

      <View className="flex-row flex-wrap items-center justify-end gap-3">
        <View testID="placement-result-done">
          <TactileButton variant="primary" size="lg" label={embedded ? t.ctaContinue : t.ctaHome} onPress={onDone} />
        </View>
      </View>

      {!embedded ? <HistoryList entries={result.history} t={t} bcp47={bcp47} /> : null}
    </View>
  );
}

type SaveState = "idle" | "saving" | "saved" | "failed";

function CanDoChecklist({
  t,
  locale,
  level,
  onSave,
}: {
  t: PlacementCopy;
  locale: DisplayLocale;
  level: string;
  onSave: (held: string[]) => Promise<void>;
}) {
  const items = canDoFor(level);
  const [held, setHeld] = useState<string[]>([]);
  const [save, setSave] = useState<SaveState>("idle");

  if (items.length === 0) {
    return null;
  }

  function toggle(id: string) {
    setHeld((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
    setSave((current) => (current === "saving" ? current : "idle"));
  }

  async function submit() {
    setSave("saving");
    try {
      await onSave(held);
      setSave("saved");
    } catch {
      setSave("failed");
    }
  }

  return (
    <TactileCard animateEntry={false} className="p-5" style={{ padding: 20 }}>
      <View className="gap-4" testID="placement-can-do-section">
        <View className="gap-1">
          <SectionLabel>{fillCopy(t.canDoTitle, { level })}</SectionLabel>
          <Text className="font-sans text-sm leading-6 text-[#64748B]">{t.canDoHint}</Text>
        </View>
        <View className="gap-2">
          {items.map((item) => {
            const on = held.includes(item.id);
            return (
              <Pressable
                key={item.id}
                testID={`placement-can-do-item-${item.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(item.id)}
                className={`min-h-12 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                  on ? "border-[#0D9488] bg-[#F0FDFA]" : "border-[#E2E8F0] bg-white"
                }`}
                style={Platform.OS === "web" ? ({ cursor: "pointer" } as object) : undefined}
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-md ${on ? "bg-[#0D9488]" : "bg-white"}`}
                  style={{ borderWidth: 2, borderColor: on ? "#0F766E" : "#CBD5E1" }}
                >
                  {on ? <Icon name="check" color="#FFFFFF" size={16} strokeWidth={2.5} /> : null}
                </View>
                <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-[#111C2D]">{canDoText(item, locale)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row flex-wrap items-center gap-3">
          <View testID="placement-save-can-do">
            <TactileButton
              variant="secondary"
              size="md"
              label={save === "saving" ? t.canDoSaving : t.canDoSave}
              disabled={save === "saving" || save === "saved"}
              onPress={() => void submit()}
            />
          </View>
          {save === "saved" ? (
            <Text accessibilityLiveRegion="polite" className="font-sans text-sm font-bold text-[#0F766E]">
              {t.canDoSaved}
            </Text>
          ) : null}
          {save === "failed" ? (
            <Text accessibilityRole="alert" className="font-sans text-sm text-[#B91C1C]">
              {t.canDoFailed}
            </Text>
          ) : null}
        </View>
      </View>
    </TactileCard>
  );
}
