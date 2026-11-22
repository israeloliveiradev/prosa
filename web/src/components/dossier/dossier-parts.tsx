import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { BodyText } from "@/features/shell/tactile-page";
import type { DossierView } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { DOSSIER } from "@/lib/copy/dossier";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { languageName } from "@/lib/languages";

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** Medida do dossiê. Sem dado, o "não medido" sai pequeno e discreto, não na fonte dos números. */
export function Stat({ label, value, testID, empty = false }: { label: string; value: string; testID: string; empty?: boolean }) {
  return (
    <View testID={testID} style={{ flexGrow: 1, flexBasis: 140, gap: 2 }}>
      <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: tactile.muted }}>{label}</Text>
      <Text
        style={
          empty
            ? { fontFamily: tactile.font, fontSize: 15, lineHeight: 22, fontWeight: "600", color: tactile.muted, paddingTop: 4 }
            : { fontFamily: tactile.font, fontSize: 24, fontWeight: "800", color: tactile.ink, fontVariant: ["tabular-nums"] }
        }
      >
        {value}
      </Text>
    </View>
  );
}

export function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <BodyText tone="muted">{empty}</BodyText>;
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <View key={item} style={{ backgroundColor: tactile.raised, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "700", color: tactile.ink }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Card({ title, icon, testID, children }: { title: string; icon: "book" | "target" | "route" | "mic" | "check" | "globe" | "pen"; testID: string; children: ReactNode }) {
  return (
    <TactilePanel testID={testID}>
      <PanelKicker icon={icon}>{title}</PanelKicker>
      {children}
    </TactilePanel>
  );
}

/** Resumo, prática, erros e sons: o corpo de leitura, igual no Dossiê do aluno e na página pública. */
export function DossierCore({ data }: { data: DossierView }) {
  const t = useAreaCopy(DOSSIER);
  const locale = useLocale();
  const measure = (value: number) => (value > 0 ? String(Math.round(value)) : t.noData);
  const date = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(LOCALE_BCP47[locale]);
    } catch {
      return iso;
    }
  };
  return (
    <>
      <Card title={t.summaryTitle} icon="globe" testID="dossier-summary">
        <BodyText tone="ink">{fill(t.level, { level: data.level, lang: languageName(data.target_lang) })}</BodyText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <Stat testID="dossier-lexicon" label={t.lexicon} value={measure(data.lexicon)} empty={!(data.lexicon > 0)} />
          <Stat testID="dossier-fluency" label={t.fluency} value={measure(data.fluency_wpm)} empty={!(data.fluency_wpm > 0)} />
          <Stat testID="dossier-listening" label={t.listening} value={measure(data.listening)} empty={!(data.listening > 0)} />
          <Stat testID="dossier-reading" label={t.reading} value={measure(data.reading)} empty={!(data.reading > 0)} />
        </View>
        <BodyText tone="muted">
          {data.last_placement ? fill(t.placement, { level: data.last_placement.level, date: date(data.last_placement.finished_at) }) : t.placementNone}
        </BodyText>
        <BodyText tone="muted">{data.prosa_score ? fill(t.score, { score: data.prosa_score.score, band: data.prosa_score.band }) : t.scoreNone}</BodyText>
      </Card>

      <Card title={t.practiceTitle} icon="target" testID="dossier-practice">
        <BodyText tone={data.practice ? "ink" : "muted"}>{data.practice || t.practiceNone}</BodyText>
      </Card>

      <Card title={t.errorsTitle} icon="pen" testID="dossier-errors">
        <Chips items={data.errors} empty={t.listNone} />
      </Card>

      <Card title={t.soundsTitle} icon="mic" testID="dossier-sounds">
        <Chips items={data.sounds} empty={t.listNone} />
      </Card>
    </>
  );
}
