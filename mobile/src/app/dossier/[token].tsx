import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { fetchPublicDossier, type DossierView } from "@/lib/api";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";

export default function PublicDossierPage() {
  const copy = useCopy();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [pack, setPack] = useState<DossierView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(copy.dossierMissing);
      return;
    }
    let active = true;
    void fetchPublicDossier(token)
      .then((next) => {
        if (active) {
          setPack(next);
        }
      })
      .catch(() => {
        if (active) {
          setError(copy.dossierMissing);
        }
      });
    return () => {
      active = false;
    };
  }, [token, copy.dossierMissing]);

  return (
    <AppFrame>
      <View className="gap-6">
        <PageMasthead kicker={copy.dossierKicker} title={copy.dossierTitle} dek={copy.dossierDek} />
        {error ? <Text className="text-base leading-7 text-ember">{error}</Text> : null}
        {pack ? (
          <View className="gap-4 rounded-3xl border border-line bg-card px-6 py-6">
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
            {pack.checkpoints.map((item) => (
              <View key={item.id} className="gap-1 border-t border-line pt-4">
                <Text className="text-lg text-ink">{item.focus}</Text>
                {item.note ? <Text className="text-base text-muted">{item.note}</Text> : null}
                {item.due_on ? <Text className="text-sm text-muted">{`${copy.dossierDue} ${item.due_on}`}</Text> : null}
                {item.done ? <Text className="text-base text-ember">{copy.dossierDone}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
        {Platform.OS === "web" && pack ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5"
          >
            <Text className="text-base font-semibold text-ink">{copy.dossierPrint}</Text>
          </Pressable>
        ) : null}
      </View>
    </AppFrame>
  );
}
