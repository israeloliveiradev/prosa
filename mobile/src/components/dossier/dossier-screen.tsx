import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import {
  addDossierCheckpoint,
  closeDossierCheckpoint,
  fetchDossier,
  publishDossier,
  type DossierMine,
} from "@/lib/api";
import { writeClipboard } from "@/lib/clipboard";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

function shareUrl(token: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/dossier/${token}`;
  }
  return `/dossier/${token}`;
}

export function DossierScreen() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
  const token = session?.token;
  const targetLang = session?.user.target_lang ?? "en";
  const [pack, setPack] = useState<DossierMine | null>(null);
  const [focus, setFocus] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    void fetchDossier(token, targetLang)
      .then((next) => {
        if (active) {
          setPack(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setStatus(caught instanceof Error ? caught.message : copy.dossierQuiet);
        }
      });
    return () => {
      active = false;
    };
  }, [token, targetLang, copy.dossierQuiet]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;

  async function publish() {
    setPending(true);
    setStatus(null);
    try {
      const next = await publishDossier(auth, targetLang);
      setPack(next);
      if (next.share_token) {
        const ok = await writeClipboard(shareUrl(next.share_token));
        setStatus(ok ? copy.dossierCopied : shareUrl(next.share_token));
      }
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.dossierQuiet);
    } finally {
      setPending(false);
    }
  }

  async function addCheck() {
    if (focus.trim().length < 2) {
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      const next = await addDossierCheckpoint(auth, {
        target_lang: targetLang,
        focus: focus.trim(),
        note: note.trim(),
        due_on: /^\d{4}-\d{2}-\d{2}$/.test(due.trim()) ? due.trim() : undefined,
      });
      setPack(next);
      setFocus("");
      setNote("");
      setDue("");
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.dossierQuiet);
    } finally {
      setPending(false);
    }
  }

  async function closeCheck(id: string) {
    setPending(true);
    try {
      setPack(await closeDossierCheckpoint(auth, id));
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.dossierQuiet);
    } finally {
      setPending(false);
    }
  }

  const link = pack?.share_token ? shareUrl(pack.share_token) : null;

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker={copy.dossierKicker} title={copy.dossierTitle} dek={copy.dossierDek} />
        {pack ? (
          <View className="gap-3 rounded-3xl border border-line bg-card px-6 py-6">
            <Text className="text-base text-muted">{languageName(pack.target_lang)}</Text>
            <Text className="font-displayItalic text-display text-ink">{pack.level}</Text>
            {pack.practice ? (
              <View>
                <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.dossierPractice}</Text>
                <Text className="mt-1 text-lg leading-7 text-ink">{pack.practice}</Text>
              </View>
            ) : null}
            {pack.last_placement ? (
              <Text className="text-base text-muted">{`${copy.dossierLevel} ${pack.last_placement.level} · ${pack.last_placement.finished_at.slice(0, 10)}`}</Text>
            ) : null}
            {pack.prosa_score ? (
              <Text className="text-base text-muted">{`${copy.dossierScore} ${pack.prosa_score.score} · ${pack.prosa_score.band}`}</Text>
            ) : null}
            {pack.lexicon > 0 ? <Text className="text-base text-muted">{`${copy.measureLexicon} ${pack.lexicon}`}</Text> : null}
            {pack.fluency_wpm > 0 ? <Text className="text-base text-muted">{`${copy.measureFluency} ${pack.fluency_wpm}`}</Text> : null}
            {pack.errors.length > 0 ? <Text className="text-base text-muted">{`${copy.measureErrors} ${pack.errors.join(" · ")}`}</Text> : null}
            {pack.sounds.length > 0 ? <Text className="text-base text-muted">{pack.sounds.join(" · ")}</Text> : null}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => void publish()}
          disabled={pending}
          className="min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
        >
          <Text className="text-base font-semibold text-paper">{copy.dossierShare}</Text>
        </Pressable>
        {link ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void writeClipboard(link).then((ok) => setStatus(ok ? copy.dossierCopied : link));
            }}
            className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
          >
            <Text className="text-base font-semibold text-ink">{copy.dossierCopy}</Text>
          </Pressable>
        ) : null}
        <View className="gap-3">
          <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.dossierCheckpoint}</Text>
          <TextInput
            value={focus}
            onChangeText={setFocus}
            accessibilityLabel={copy.dossierFocus}
            placeholder={copy.dossierFocus}
            placeholderTextColor={palette.onSurfaceVariant}
            className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            accessibilityLabel={copy.dossierNote}
            placeholder={copy.dossierNote}
            placeholderTextColor={palette.onSurfaceVariant}
            className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
          />
          <TextInput
            value={due}
            onChangeText={setDue}
            accessibilityLabel={copy.dossierDue}
            placeholder="2026-10-15"
            placeholderTextColor={palette.onSurfaceVariant}
            className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void addCheck()}
            disabled={pending || focus.trim().length < 2}
            className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
          >
            <Text className="text-base font-semibold text-ink">{copy.dossierAdd}</Text>
          </Pressable>
        </View>
        {pack?.checkpoints.map((item) => (
          <View key={item.id} className="gap-2 rounded-3xl border border-line bg-card px-5 py-4">
            <Text className="text-lg text-ink">{item.focus}</Text>
            {item.note ? <Text className="text-base text-muted">{item.note}</Text> : null}
            {item.due_on ? <Text className="text-sm text-muted">{`${copy.dossierDue} ${item.due_on}`}</Text> : null}
            {item.done ? (
              <Text className="text-base text-ember">{copy.dossierDone}</Text>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => void closeCheck(item.id)} disabled={pending}>
                <Text className="text-base font-semibold text-ember">{copy.dossierDone}</Text>
              </Pressable>
            )}
          </View>
        ))}
        {status ? <Text className="text-base text-ember">{status}</Text> : null}
      </View>
    </AppFrame>
  );
}
