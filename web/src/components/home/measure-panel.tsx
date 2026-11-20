import { useCallback, useEffect, useState } from "react";
import { Text, View, type ViewStyle } from "react-native";
import { fill } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { fetchMeasure, type MeasurePanel } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { PROFILE, listeningBand } from "@/lib/copy/profile";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

type MeasureState = { status: "loading" } | { status: "error" } | { status: "ready"; panel: MeasurePanel };

/** Uma busca por (conta, idioma) de cada vez: MeasureBoard, CompetenceLine e CefrHistory dividem a mesma chamada. */
const inflight = new Map<string, Promise<MeasurePanel>>();

function loadMeasure(token: string, targetLang: string): Promise<MeasurePanel> {
  const key = `${token}|${targetLang}`;
  const running = inflight.get(key);
  if (running) {
    return running;
  }
  const next = fetchMeasure(token, targetLang).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, next);
  return next;
}

/** Painel de medidas do servidor (GET /api/v1/measure) para o idioma de estudo. */
export function useMeasure(targetLang: string): { state: MeasureState; reload: () => void } {
  const session = useSession();
  const token = session?.token;
  const [state, setState] = useState<MeasureState>({ status: "loading" });
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setState({ status: "loading" });
    loadMeasure(token, targetLang)
      .then((panel) => {
        if (active) {
          setState({ status: "ready", panel });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "error" });
        }
      });
    return () => {
      active = false;
    };
  }, [token, targetLang, round]);

  const reload = useCallback(() => setRound((current) => current + 1), []);
  return { state, reload };
}

function isQuiet(panel: MeasurePanel): boolean {
  return (
    panel.cefr.length === 0 &&
    panel.lexicon === 0 &&
    panel.retention === null &&
    panel.fluency_wpm === 0 &&
    panel.listening === 0 &&
    panel.reading === 0
  );
}

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View
      className="flex-1 rounded-xl border border-[#E2E8F0] bg-white p-4"
      style={{ minWidth: 140, flexBasis: 150, boxShadow: "0 3px 0 #E2E8F0" } as ViewStyle}
    >
      <Text className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">{label}</Text>
      <Text className="mt-1 text-2xl font-black text-[#111C2D]">{value}</Text>
      {detail ? <Text className="mt-0.5 text-xs text-[#64748B]">{detail}</Text> : null}
    </View>
  );
}

function MeasureFailure({ onRetry }: { onRetry: () => void }) {
  const t = useAreaCopy(PROFILE);
  return (
    <View accessibilityRole="alert" className="gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <Text className="text-base" style={{ color: "#9F1239" }}>
        {t.measureError}
      </Text>
      <View className="self-start">
        <TactileButton label={t.retry} variant="secondary" size="sm" onPress={onRetry} />
      </View>
    </View>
  );
}

/**
 * Medidas reais: retenção (com a meta), léxico, fala em palavras por minuto, escuta e leitura (0–100),
 * erros que ainda escapam e, se `showCefr`, o histórico de nivelamentos.
 */
export function MeasureBoard({ targetLang, showCefr = true }: { targetLang: string; showCefr?: boolean }) {
  const t = useAreaCopy(PROFILE);
  const { state, reload } = useMeasure(targetLang);

  if (state.status === "loading") {
    return (
      <Text accessibilityLiveRegion="polite" className="text-base text-[#64748B]">
        {t.measureLoading}
      </Text>
    );
  }
  if (state.status === "error") {
    return <MeasureFailure onRetry={reload} />;
  }

  const panel = state.panel;
  if (isQuiet(panel)) {
    return <Text className="text-base leading-6 text-[#3D4947]">{t.measureQuiet}</Text>;
  }

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-3">
        {panel.retention !== null ? (
          <Tile label={t.retention} value={`${panel.retention}%`} detail={fill(t.retentionAim, { aim: panel.retention_aim })} />
        ) : null}
        {panel.lexicon > 0 ? <Tile label={t.words} value={String(panel.lexicon)} /> : null}
        {panel.fluency_wpm > 0 ? <Tile label={t.fluency} value={String(panel.fluency_wpm)} detail={t.fluencyUnit} /> : null}
        {panel.listening > 0 ? <Tile label={t.listening} value={String(panel.listening)} detail={t.outOf100} /> : null}
        {panel.reading > 0 ? <Tile label={t.reading} value={String(panel.reading)} detail={t.outOf100} /> : null}
      </View>
      {panel.errors.length > 0 ? (
        <View className="rounded-xl bg-[#F5F0E8] px-4 py-3">
          <Text className="text-xs font-extrabold uppercase tracking-wider text-[#3D4947]">{t.errors}</Text>
          <Text className="mt-1 text-sm leading-5 text-[#111C2D]">{panel.errors.join(" · ")}</Text>
        </View>
      ) : null}
      {showCefr ? <CefrRows rows={panel.cefr} /> : null}
    </View>
  );
}

function CefrRows({ rows }: { rows: MeasurePanel["cefr"] }) {
  const t = useAreaCopy(PROFILE);
  const locale = useLocale();
  if (rows.length === 0) {
    return <Text className="text-base text-[#64748B]">{t.cefrEmpty}</Text>;
  }
  const ordered = [...rows].sort((a, b) => Date.parse(b.finished_at) - Date.parse(a.finished_at));
  return (
    <View className="gap-2">
      {ordered.map((row) => {
        const at = Date.parse(row.finished_at);
        let when = row.finished_at.slice(0, 10);
        if (!Number.isNaN(at)) {
          try {
            when = new Date(at).toLocaleDateString(LOCALE_BCP47[locale], { day: "numeric", month: "short", year: "numeric" });
          } catch {
            // mantém a data ISO
          }
        }
        return (
          <View key={row.finished_at} className="flex-row items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
            <View className="items-center rounded-lg bg-[#0D9488] px-2 py-1" style={{ minWidth: 48 }}>
              <Text className="text-sm font-black text-white">{row.level}</Text>
            </View>
            <Text className="flex-1 text-sm text-[#3D4947]">{when}</Text>
            <Text className="text-sm font-semibold text-[#111C2D]">{fill(t.cefrScore, { score: row.score })}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Histórico de nivelamentos (CEFR) do idioma, vindo do mesmo painel de medidas. */
export function CefrHistory({ targetLang }: { targetLang: string }) {
  const { state, reload } = useMeasure(targetLang);
  const t = useAreaCopy(PROFILE);
  if (state.status === "loading") {
    return (
      <Text accessibilityLiveRegion="polite" className="text-base text-[#64748B]">
        {t.measureLoading}
      </Text>
    );
  }
  if (state.status === "error") {
    return <MeasureFailure onRetry={reload} />;
  }
  return <CefrRows rows={state.panel.cefr} />;
}

/** Uma linha do que o aluno já faz: léxico lido e faixa estimada da escuta. */
export function CompetenceLine({ targetLang }: { targetLang: string }) {
  const t = useAreaCopy(PROFILE);
  const { state } = useMeasure(targetLang);

  if (state.status !== "ready") {
    return null;
  }
  const panel = state.panel;
  const band = listeningBand(panel.listening);
  if (panel.lexicon === 0 && !band) {
    return null;
  }

  return (
    <View className="rounded-xl border px-4 py-3" style={{ borderColor: "#99F6E4", backgroundColor: "#F0FDFA" }}>
      {panel.lexicon > 0 ? (
        <Text className="text-base leading-6" style={{ color: "#134E4A" }}>
          {fill(t.competenceWords, { n: panel.lexicon })}
        </Text>
      ) : null}
      {band ? (
        <Text className="mt-1 text-base leading-6" style={{ color: "#134E4A" }}>
          {fill(t.competenceListen, { level: band })}
        </Text>
      ) : null}
    </View>
  );
}
