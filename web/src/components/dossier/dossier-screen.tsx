import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { Card, DossierCore, fill } from "@/components/dossier/dossier-parts";
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
import { useSession } from "@/lib/session";

/** Link público: a página /dossier/<token> do próprio app, não o JSON da API. */
function shareUrl(token: string): string {
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  return `${origin}/dossier/${encodeURIComponent(token)}`;
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
          <DossierCore data={data} />

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
