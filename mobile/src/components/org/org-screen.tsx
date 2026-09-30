import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { addOrgTerm, createOrg, fetchOrg, joinOrg, leaveOrg, type OrgPack } from "@/lib/api";
import { writeClipboard } from "@/lib/clipboard";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

const SECTORS = ["technology", "health", "sales"] as const;

export function OrgScreen() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
  const token = session?.token;
  const targetLang = session?.user.target_lang ?? "en";
  const [pack, setPack] = useState<OrgPack | null>(null);
  const [name, setName] = useState("");
  const [sector, setSector] = useState<(typeof SECTORS)[number]>("technology");
  const [code, setCode] = useState("");
  const [phrase, setPhrase] = useState("");
  const [gloss, setGloss] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    void fetchOrg(token)
      .then((next) => {
        if (active) {
          setPack(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setStatus(caught instanceof Error ? caught.message : copy.orgEmpty);
        }
      });
    return () => {
      active = false;
    };
  }, [token, copy.orgEmpty]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;
  const staff = pack?.role === "owner" || pack?.role === "hr";

  function sectorLabel(value: (typeof SECTORS)[number]): string {
    if (value === "health") {
      return copy.orgHealth;
    }
    if (value === "sales") {
      return copy.orgSales;
    }
    return copy.orgTech;
  }

  async function create() {
    if (name.trim().length < 2) {
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      setPack(await createOrg(auth, name.trim(), sector));
      setName("");
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.orgEmpty);
    } finally {
      setPending(false);
    }
  }

  async function join() {
    if (code.trim().length < 6) {
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      setPack(await joinOrg(auth, code.trim()));
      setCode("");
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.orgEmpty);
    } finally {
      setPending(false);
    }
  }

  async function addWord() {
    if (phrase.trim().length < 2) {
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      setPack(await addOrgTerm(auth, { target_lang: targetLang, phrase: phrase.trim(), gloss: gloss.trim() }));
      setPhrase("");
      setGloss("");
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.orgEmpty);
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    setPending(true);
    setStatus(null);
    try {
      setPack(await leaveOrg(auth));
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.orgEmpty);
    } finally {
      setPending(false);
    }
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker={copy.orgKicker} title={copy.orgTitle} dek={copy.orgDek} />
        {pack?.org ? (
          <View className="gap-3 rounded-3xl border border-line bg-card px-6 py-6">
            <Text className="font-displayItalic text-display text-ink">{pack.org.name}</Text>
            <Text className="text-base text-muted">{sectorLabel(pack.org.sector)}</Text>
            {pack.org.invite_code ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void writeClipboard(pack.org?.invite_code ?? "").then((ok) => {
                    setStatus(ok ? copy.orgCopied : pack.org?.invite_code ?? "");
                  });
                }}
                className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
              >
                <Text className="text-base font-semibold text-ink">{copy.orgCopy}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="gap-3">
            <TextInput
              value={name}
              onChangeText={setName}
              accessibilityLabel={copy.orgName}
              placeholder={copy.orgName}
              placeholderTextColor={palette.onSurfaceVariant}
              className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
            />
            <View className="flex-row flex-wrap gap-2">
              {SECTORS.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setSector(item)}
                  className={`min-h-12 items-center justify-center rounded-full px-5 ${sector === item ? "bg-ember" : "border border-line"}`}
                >
                  <Text className={`text-base font-semibold ${sector === item ? "text-paper" : "text-ink"}`}>{sectorLabel(item)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void create()}
              disabled={pending || name.trim().length < 2}
              className="min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
            >
              <Text className="text-base font-semibold text-paper">{copy.orgCreate}</Text>
            </Pressable>
            <TextInput
              value={code}
              onChangeText={setCode}
              accessibilityLabel={copy.orgCode}
              placeholder={copy.orgCode}
              placeholderTextColor={palette.onSurfaceVariant}
              className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void join()}
              disabled={pending || code.trim().length < 6}
              className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.orgJoin}</Text>
            </Pressable>
          </View>
        )}
        {pack?.terms.length ? (
          <View className="gap-3">
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.orgTerms}</Text>
            {pack.terms.map((item) => (
              <View key={`${item.source}-${item.phrase}`}>
                <Text className="text-lg text-ink">{item.phrase}</Text>
                {item.gloss ? <Text className="text-sm text-muted">{item.gloss}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
        {staff ? (
          <View className="gap-3">
            <TextInput
              value={phrase}
              onChangeText={setPhrase}
              accessibilityLabel={copy.orgPhrase}
              placeholder={copy.orgPhrase}
              placeholderTextColor={palette.onSurfaceVariant}
              className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
            />
            <TextInput
              value={gloss}
              onChangeText={setGloss}
              accessibilityLabel={copy.orgGloss}
              placeholder={copy.orgGloss}
              placeholderTextColor={palette.onSurfaceVariant}
              className="rounded-[28px] bg-card px-5 py-4 text-lg text-ink"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void addWord()}
              disabled={pending || phrase.trim().length < 2}
              className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{copy.orgAdd}</Text>
            </Pressable>
          </View>
        ) : null}
        {staff && pack ? (
          <View className="gap-3">
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.orgRoster}</Text>
            {pack.roster.map((row, index) => (
              <View key={`${row.name ?? "conta"}-${row.target_lang}-${index}`} className="gap-1 rounded-3xl border border-line bg-card px-5 py-4">
                {row.name ? <Text className="text-lg text-ink">{row.name}</Text> : null}
                <Text className="text-base text-muted">{`${languageName(row.target_lang)} · ${row.level}`}</Text>
                {row.prosa_score ? (
                  <Text className="text-base text-ink">{`${copy.dossierScore} ${row.prosa_score.score} · ${row.prosa_score.band}`}</Text>
                ) : (
                  <Text className="text-base text-muted">{copy.orgQuiet}</Text>
                )}
                {row.lexicon ? <Text className="text-sm text-muted">{`${copy.measureLexicon} ${row.lexicon}`}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
        {pack?.org ? (
          <Pressable accessibilityRole="button" onPress={() => void leave()} disabled={pending}>
            <Text className="text-base font-semibold text-ember">{copy.orgLeave}</Text>
          </Pressable>
        ) : null}
        {status ? <Text className="text-base text-ember">{status}</Text> : null}
      </View>
    </AppFrame>
  );
}
