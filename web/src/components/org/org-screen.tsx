import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { tactile } from "@/components/tactile/tokens";
import { addOrgTerm, createOrg, fetchOrg, joinOrg, leaveOrg, type OrgPack } from "@/lib/api";
import { writeClipboard } from "@/lib/clipboard";
import { useAreaCopy } from "@/lib/copy/area";
import { ORG } from "@/lib/copy/org";
import { tap } from "@/lib/haptics";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";

const SECTORS = ["technology", "health", "sales"] as const;

const INPUT_STYLE = {
  minHeight: 52,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: tactile.border,
  backgroundColor: tactile.surface,
  paddingHorizontal: 16,
  fontSize: 16,
  color: tactile.ink,
} as const;

const KICKER_STYLE = {
  fontSize: 11,
  fontWeight: "800",
  letterSpacing: 1,
  textTransform: "uppercase",
  color: tactile.primary,
} as const;

/** Equipe: cria ou entra numa organização, guarda palavras do setor e mostra o progresso verificado. */
export function OrgScreen() {
  const session = useSession();
  const t = useAreaCopy(ORG);
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
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
      .catch(() => {
        if (active) {
          setStatus(t.empty);
        }
      });
    return () => {
      active = false;
    };
  }, [token, t.empty]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;
  const staff = pack?.role === "owner" || pack?.role === "hr";

  function sectorLabel(value: (typeof SECTORS)[number]): string {
    if (value === "health") {
      return t.health;
    }
    if (value === "sales") {
      return t.sales;
    }
    return t.tech;
  }

  /** Roda uma chamada de rede com o estado de espera e a mensagem de erro padrão. */
  async function run(action: () => Promise<void>) {
    setPending(true);
    setStatus(null);
    try {
      await action();
      void tap("success");
    } catch {
      setStatus(t.empty);
    } finally {
      setPending(false);
    }
  }

  const create = () =>
    name.trim().length < 2
      ? undefined
      : run(async () => {
          setPack(await createOrg(auth, name.trim(), sector));
          setName("");
        });
  const join = () =>
    code.trim().length < 6
      ? undefined
      : run(async () => {
          setPack(await joinOrg(auth, code.trim()));
          setCode("");
        });
  const addWord = () =>
    phrase.trim().length < 2
      ? undefined
      : run(async () => {
          setPack(await addOrgTerm(auth, { target_lang: targetLang, phrase: phrase.trim(), gloss: gloss.trim() }));
          setPhrase("");
          setGloss("");
        });
  const leave = () => run(async () => setPack(await leaveOrg(auth)));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 24, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 992, alignSelf: "center", paddingHorizontal: 16, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text style={KICKER_STYLE}>{t.kicker}</Text>
          <Text accessibilityRole="header" className="font-display text-3xl font-extrabold" style={{ color: tactile.ink }}>
            {t.title}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: tactile.body, maxWidth: 640 }}>{t.dek}</Text>
        </View>

        {pack?.org ? (
          <TactileCard className="p-6" animateEntry={false}>
            <View style={{ gap: 8 }}>
              <Text className="font-display text-2xl font-extrabold" style={{ color: tactile.ink }}>
                {pack.org.name}
              </Text>
              <Text style={{ fontSize: 15, color: tactile.muted }}>{sectorLabel(pack.org.sector)}</Text>
              {pack.org.invite_code ? (
                <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  <TactileButton
                    variant="secondary"
                    size="md"
                    label={t.copy}
                    onPress={() => {
                      void writeClipboard(pack.org?.invite_code ?? "").then((ok) => {
                        setStatus(ok ? t.copied : (pack.org?.invite_code ?? ""));
                      });
                    }}
                  />
                </View>
              ) : null}
            </View>
          </TactileCard>
        ) : (
          <TactileCard className="p-6" animateEntry={false}>
            <View style={{ gap: 12 }}>
              <TextInput
                value={name}
                onChangeText={setName}
                accessibilityLabel={t.name}
                placeholder={t.name}
                placeholderTextColor={tactile.faint}
                style={INPUT_STYLE}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SECTORS.map((item) => (
                  <TactileButton
                    key={item}
                    variant={sector === item ? "primary" : "secondary"}
                    size="sm"
                    label={sectorLabel(item)}
                    onPress={() => setSector(item)}
                  />
                ))}
              </View>
              <View style={{ alignSelf: "flex-start" }}>
                <TactileButton label={t.create} onPress={() => void create()} disabled={pending || name.trim().length < 2} />
              </View>
              <View style={{ height: 1, backgroundColor: tactile.border, marginVertical: 8 }} />
              <TextInput
                value={code}
                onChangeText={setCode}
                accessibilityLabel={t.code}
                placeholder={t.code}
                placeholderTextColor={tactile.faint}
                autoCapitalize="characters"
                style={INPUT_STYLE}
              />
              <View style={{ alignSelf: "flex-start" }}>
                <TactileButton
                  variant="secondary"
                  label={t.join}
                  onPress={() => void join()}
                  disabled={pending || code.trim().length < 6}
                />
              </View>
            </View>
          </TactileCard>
        )}

        {pack?.terms.length ? (
          <View style={{ gap: 10 }}>
            <Text style={KICKER_STYLE}>{t.terms}</Text>
            {pack.terms.map((item) => (
              <View key={`${item.source}-${item.phrase}`}>
                <Text style={{ fontSize: 17, color: tactile.ink }}>{item.phrase}</Text>
                {item.gloss ? <Text style={{ fontSize: 14, color: tactile.muted }}>{item.gloss}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {staff ? (
          <TactileCard className="p-6" animateEntry={false}>
            <View style={{ gap: 12 }}>
              <TextInput
                value={phrase}
                onChangeText={setPhrase}
                accessibilityLabel={t.phrase}
                placeholder={t.phrase}
                placeholderTextColor={tactile.faint}
                style={INPUT_STYLE}
              />
              <TextInput
                value={gloss}
                onChangeText={setGloss}
                accessibilityLabel={t.gloss}
                placeholder={t.gloss}
                placeholderTextColor={tactile.faint}
                style={INPUT_STYLE}
              />
              <View style={{ alignSelf: "flex-start" }}>
                <TactileButton
                  variant="secondary"
                  label={t.add}
                  onPress={() => void addWord()}
                  disabled={pending || phrase.trim().length < 2}
                />
              </View>
            </View>
          </TactileCard>
        ) : null}

        {staff && pack ? (
          <View style={{ gap: 10 }}>
            <Text style={KICKER_STYLE}>{t.roster}</Text>
            {pack.roster.map((row, index) => (
              <TactileCard key={`${row.name ?? "conta"}-${row.target_lang}-${index}`} className="p-4" animateEntry={false}>
                <View style={{ gap: 4 }}>
                  {row.name ? <Text style={{ fontSize: 17, fontWeight: "700", color: tactile.ink }}>{row.name}</Text> : null}
                  <Text style={{ fontSize: 15, color: tactile.muted }}>{`${languageName(row.target_lang)} · ${row.level}`}</Text>
                  {row.prosa_score ? (
                    <Text style={{ fontSize: 15, color: tactile.ink }}>{`${t.score} ${row.prosa_score.score} · ${row.prosa_score.band}`}</Text>
                  ) : (
                    <Text style={{ fontSize: 15, color: tactile.muted }}>{t.quiet}</Text>
                  )}
                  {row.lexicon ? <Text style={{ fontSize: 14, color: tactile.muted }}>{`${t.lexicon} ${row.lexicon}`}</Text> : null}
                </View>
              </TactileCard>
            ))}
          </View>
        ) : null}

        {pack?.org ? (
          <View style={{ alignSelf: "flex-start" }}>
            <TactileButton variant="ghost" label={t.leave} onPress={() => void leave()} disabled={pending} />
          </View>
        ) : null}
        {status ? (
          <Text accessibilityRole="alert" style={{ fontSize: 15, color: tactile.danger }}>
            {status}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
