import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { fetchScoreCertificate, type ScoreCertificate } from "@/lib/api";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";

export default function ScoreCertificatePage() {
  const copy = useCopy();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [cert, setCert] = useState<ScoreCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(copy.scoreCertMissing);
      return;
    }
    let active = true;
    void fetchScoreCertificate(token)
      .then((next) => {
        if (active) {
          setCert(next);
        }
      })
      .catch(() => {
        if (active) {
          setError(copy.scoreCertMissing);
        }
      });
    return () => {
      active = false;
    };
  }, [token, copy.scoreCertMissing]);

  return (
    <AppFrame>
      <View className="gap-6">
        <PageMasthead kicker={copy.scoreKicker} title={copy.scoreCertTitle} dek={copy.scoreCertDek} />
        {error ? <Text className="text-base leading-7 text-ember">{error}</Text> : null}
        {cert ? (
          <View className="rounded-3xl border border-line bg-card px-6 py-6">
            <Text className="font-displayItalic text-display text-ink">{cert.score}</Text>
            <Text className="mt-2 text-lg text-ink">{cert.band}</Text>
            <Text className="mt-2 text-base text-muted">{languageName(cert.target_lang)}</Text>
            <Text className="mt-1 text-sm text-muted">{cert.finished_at.slice(0, 10)}</Text>
            <View className="mt-6 gap-2">
              <Text className="text-base text-muted">{`${copy.placeReading} ${cert.sections.reading}`}</Text>
              <Text className="text-base text-muted">{`${copy.placeListening} ${cert.sections.listening}`}</Text>
              <Text className="text-base text-muted">{`${copy.journal} ${cert.sections.writing}`}</Text>
              <Text className="text-base text-muted">{`${copy.speech} ${cert.sections.speaking}`}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </AppFrame>
  );
}
