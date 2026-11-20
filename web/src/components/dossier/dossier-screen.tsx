import { Redirect, router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/api/config";
import { TactileButton } from "@/components/tactile/tactile-button";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { BodyText, TactilePage } from "@/features/shell/tactile-page";
import {
  addDossierCheckpoint,
  closeDossierCheckpoint,
  fetchDossier,
  publishDossier,
  type DossierMine,
} from "@/lib/api";
import { writeClipboard } from "@/lib/clipboard";
import { useAreaCopy } from "@/lib/copy/area";
import { DOSSIER } from "@/lib/copy/dossier";
import { tap } from "@/lib/haptics";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function shareUrl(token: string): string {
  return `${apiUrl()}/api/v1/dossier/view/${encodeURIComponent(token)}`;
}

function Stat({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View testID={testID} style={{ flexGrow: 1, flexBasis: 140, gap: 2 }}>
      <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: tactile.muted }}>{label}</Text>
      <Text style={{ fontFamily: tactile.font, fontSize: 24, fontWeight: "800", color: tactile.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
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

function Card({ title, icon, testID, children }: { title: string; icon: "book" | "target" | "route" | "mic" | "check" | "globe" | "pen"; testID: string; children: ReactNode }) {
  return (
    <TactilePanel testID={testID}>
      <PanelKicker icon={icon}>{title}</PanelKicker>
      {children}
    </TactilePanel>
  );
}

const inputStyle = {
  fontFamily: tactile.font,
  fontSize: 16,
  color: tactile.ink,
  backgroundColor: tactile.surface,
  borderWidth: 1.5,
  borderColor: tactile.border,
  borderRadius: 14,
  paddingHorizontal: 14,
  minHeight: 48,
} as const;

/** Dossiê: o nível documentado a partir de /api/v1/dossier, com metas de acompanhamento e link de leitura. */
export function DossierScreen() {
  const t = useAreaCopy(DOSSIER);
  const locale = useLocale();
  const session = useSession();
  const queryClient = useQueryClient();
  const token = session?.token;
  const target = session?.user.target_lang ?? "en";
  const key = ["dossier", session?.user.id, target] as const;
  const query = useQuery({ queryKey: key, queryFn: () => fetchDossier(token as string, target), enabled: Boolean(token), retry: false });
  const [focus, setFocus] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }
  const auth = token;
  const data = query.data;

  async function act(name: string, work: () => Promise<DossierMine>) {
    if (busy) {
      return;
    }
    setBusy(name);
    setFailed(false);
    try {
      queryClient.setQueryData(key, await work());
      void tap("success");
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  async function addGoal() {
    const dueOn = /^\d{4}-\d{2}-\d{2}$/.test(due.trim()) ? due.trim() : undefined;
    await act("add", () =>
      addDossierCheckpoint(auth, { target_lang: target, focus: focus.trim(), ...(note.trim() ? { note: note.trim() } : {}), ...(dueOn ? { due_on: dueOn } : {}) }),
    );
    setFocus("");
    setNote("");
    setDue("");
  }

  const measure = (value: number) => (value > 0 ? String(Math.round(value)) : t.noData);
  const date = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(LOCALE_BCP47[locale]);
    } catch {
      return iso;
    }
  };

  return (
    <TactilePage testID="dossier-screen" kicker={t.kicker} title={t.title} dek={t.dek}>
      {query.isLoading ? <BodyText tone="muted" testID="dossier-loading">{t.loading}</BodyText> : null}

      {query.isError ? (
        <TactilePanel testID="dossier-error">
          <BodyText tone="danger">{t.loadFailed}</BodyText>
          <View style={{ alignSelf: "flex-start" }}>
            <TactileButton testID="dossier-retry" label={t.retry} variant="secondary" size="sm" onPress={() => void query.refetch()} />
          </View>
        </TactilePanel>
      ) : null}

      {data ? (
        <>
          <Card title={t.summaryTitle} icon="globe" testID="dossier-summary">
            <BodyText tone="ink">{fill(t.level, { level: data.level, lang: languageName(data.target_lang) })}</BodyText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <Stat testID="dossier-lexicon" label={t.lexicon} value={measure(data.lexicon)} />
              <Stat testID="dossier-fluency" label={t.fluency} value={measure(data.fluency_wpm)} />
              <Stat testID="dossier-listening" label={t.listening} value={measure(data.listening)} />
              <Stat testID="dossier-reading" label={t.reading} value={measure(data.reading)} />
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

          <Card title={t.checkpointsTitle} icon="check" testID="dossier-checkpoints">
            {data.checkpoints.length === 0 ? <BodyText tone="muted">{t.checkpointsNone}</BodyText> : null}
            {data.checkpoints.map((item) => (
              <View key={item.id} testID={`dossier-checkpoint-${item.id}`} style={{ gap: 6, backgroundColor: tactile.raised, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "800", color: tactile.ink }}>{item.focus}</Text>
                {item.note ? <BodyText tone="muted">{item.note}</BodyText> : null}
                {item.due_on ? <BodyText tone="muted">{fill(t.due, { date: item.due_on })}</BodyText> : null}
                {item.done ? (
                  <BodyText tone="ink">{t.done}</BodyText>
                ) : (
                  <View style={{ alignSelf: "flex-start" }}>
                    <TactileButton
                      testID={`dossier-checkpoint-done-${item.id}`}
                      label={t.markDone}
                      variant="secondary"
                      size="sm"
                      disabled={busy !== null}
                      onPress={() => void act(`done-${item.id}`, () => closeDossierCheckpoint(auth, item.id))}
                    />
                  </View>
                )}
              </View>
            ))}
            <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "800", color: tactile.ink, marginTop: 6 }}>{t.addTitle}</Text>
            <TextInput testID="dossier-focus" value={focus} onChangeText={setFocus} maxLength={80} placeholder={t.focusLabel} accessibilityLabel={t.focusLabel} placeholderTextColor={tactile.faint} style={inputStyle} />
            <TextInput testID="dossier-note" value={note} onChangeText={setNote} maxLength={240} placeholder={t.noteLabel} accessibilityLabel={t.noteLabel} placeholderTextColor={tactile.faint} style={inputStyle} />
            <TextInput testID="dossier-due" value={due} onChangeText={setDue} maxLength={10} placeholder={t.dueLabel} accessibilityLabel={t.dueLabel} placeholderTextColor={tactile.faint} style={inputStyle} />
            <View style={{ alignSelf: "flex-start" }}>
              <TactileButton testID="dossier-add" label={t.add} variant="primary" size="sm" disabled={busy !== null || focus.trim().length < 2} onPress={() => void addGoal()} />
            </View>
          </Card>

          <Card title={t.shareTitle} icon="globe" testID="dossier-share">
            <BodyText tone="muted">{t.shareDek}</BodyText>
            {data.share_token ? (
              <>
                <BodyText tone="ink" testID="dossier-share-url">
                  {shareUrl(data.share_token)}
                </BodyText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <TactileButton
                    testID="dossier-copy"
                    label={t.copyLink}
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      void writeClipboard(shareUrl(data.share_token ?? "")).then((ok) => setCopied(ok));
                    }}
                  />
                  <TactileButton testID="dossier-republish" label={t.republish} variant="secondary" size="sm" disabled={busy !== null} onPress={() => void act("publish", () => publishDossier(auth, target))} />
                </View>
                {copied ? <BodyText testID="dossier-copied">{t.copied}</BodyText> : null}
              </>
            ) : (
              <View style={{ alignSelf: "flex-start" }}>
                <TactileButton testID="dossier-publish" label={t.publish} variant="primary" size="sm" disabled={busy !== null} onPress={() => void act("publish", () => publishDossier(auth, target))} />
              </View>
            )}
            {Platform.OS === "web" ? (
              <View style={{ alignSelf: "flex-start" }}>
                <TactileButton testID="dossier-print" label={t.print} variant="secondary" size="sm" onPress={() => window.print()} />
              </View>
            ) : null}
          </Card>

          {failed ? <BodyText tone="danger" testID="dossier-action-error">{t.actionFailed}</BodyText> : null}
        </>
      ) : null}

      <View style={{ alignSelf: "flex-start" }}>
        <TactileButton testID="dossier-back" label={t.back} variant="secondary" size="sm" onPress={() => router.push("/profile")} />
      </View>
    </TactilePage>
  );
}
