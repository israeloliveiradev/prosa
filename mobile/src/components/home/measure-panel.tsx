import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { fetchMeasure, type MeasurePanel } from "@/lib/api";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function MeasureBoard({ targetLang }: { targetLang: string }) {
  const session = useSession();
  const copy = useCopy();
  const [panel, setPanel] = useState<MeasurePanel | null>(null);

  useEffect(() => {
    const token = session?.token;
    if (!token) {
      return;
    }
    let active = true;
    void fetchMeasure(token, targetLang).then((next) => {
      if (active) {
        setPanel(next);
      }
    });
    return () => {
      active = false;
    };
  }, [session?.token, targetLang]);

  if (!panel) {
    return null;
  }

  const quiet = panel.cefr.length === 0 && panel.lexicon === 0 && panel.retention === null && panel.fluency_wpm === 0;
  if (quiet) {
    return <Text className="text-base leading-7 text-muted">{copy.measureQuiet}</Text>;
  }

  return (
    <View className="gap-4">
      <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.measureTitle}</Text>
      {panel.cefr.length > 0 ? (
        <View>
          <Text className="font-label text-sm text-ember">{copy.measureCefr}</Text>
          {panel.cefr.map((row) => (
            <Text key={row.finished_at} className="mt-1 text-base text-ink">
              {`${row.finished_at.slice(0, 10)} · ${row.level} · ${row.score}`}
            </Text>
          ))}
        </View>
      ) : null}
      {panel.retention !== null ? (
        <Text className="text-base text-ink">{`${copy.measureRetention} ${panel.retention}% · ${copy.measureAim}`}</Text>
      ) : null}
      {panel.lexicon > 0 ? <Text className="text-base text-ink">{fill(copy.competenceWords, { n: panel.lexicon })}</Text> : null}
      {panel.fluency_wpm > 0 ? <Text className="text-base text-ink">{`${copy.measureFluency} ${panel.fluency_wpm}`}</Text> : null}
      {panel.errors.length > 0 ? <Text className="text-base text-muted">{`${copy.measureErrors}: ${panel.errors.join(", ")}`}</Text> : null}
    </View>
  );
}

export function CompetenceLine({ targetLang }: { targetLang: string }) {
  const session = useSession();
  const copy = useCopy();
  const [panel, setPanel] = useState<MeasurePanel | null>(null);

  useEffect(() => {
    const token = session?.token;
    if (!token) {
      return;
    }
    let active = true;
    void fetchMeasure(token, targetLang).then((next) => {
      if (active) {
        setPanel(next);
      }
    });
    return () => {
      active = false;
    };
  }, [session?.token, targetLang]);

  if (!panel || (panel.lexicon === 0 && panel.listening === 0)) {
    return null;
  }

  const listenLevel = panel.listening >= 75 ? "B2" : panel.listening >= 55 ? "B1" : panel.listening >= 40 ? "A2" : panel.listening > 0 ? "A1" : "";
  return (
    <View className="rounded-3xl border border-line bg-card px-5 py-4">
      {panel.lexicon > 0 ? <Text className="text-base leading-7 text-ink">{fill(copy.competenceWords, { n: panel.lexicon })}</Text> : null}
      {listenLevel ? <Text className="mt-1 text-base text-muted">{fill(copy.competenceListen, { level: listenLevel })}</Text> : null}
    </View>
  );
}
