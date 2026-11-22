import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ProsaLogo } from "@/components/ProsaLogo";
import { TactileCard } from "@/components/tactile/tactile-card";
import { tactile } from "@/components/tactile/tokens";
import { fetchScoreCertificate, type ScoreCertificate } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { CERT } from "@/lib/copy/cert";
import { languageName } from "@/lib/languages";

/** Certificado público do Prosa Score: cartão centrado com a marca, sem o shell do app. */
export default function ScoreCertificatePage() {
  const t = useAreaCopy(CERT);
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [cert, setCert] = useState<ScoreCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t.missing);
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
          setError(t.missing);
        }
      });
    return () => {
      active = false;
    };
  }, [token, t.missing]);

  const sections = cert
    ? [
        [t.reading, cert.sections.reading],
        [t.listening, cert.sections.listening],
        [t.writing, cert.sections.writing],
        [t.speaking, cert.sections.speaking],
      ]
    : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tactile.bg }} contentContainerStyle={{ flexGrow: 1, paddingVertical: 32, paddingBottom: 64 }}>
      <View style={{ width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 16, gap: 24 }}>
        <View style={{ alignItems: "center" }}>
          <ProsaLogo variant="full" href="/" />
        </View>
        <View style={{ gap: 6, alignItems: "center" }}>
          <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: tactile.primary }}>{t.kicker}</Text>
          <Text accessibilityRole="header" className="font-display text-3xl font-extrabold" style={{ color: tactile.ink }}>
            {t.title}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: tactile.body, textAlign: "center" }}>{t.dek}</Text>
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={{ fontSize: 16, lineHeight: 24, color: tactile.danger, textAlign: "center" }}>
            {error}
          </Text>
        ) : null}
        {cert ? (
          <TactileCard className="p-6" animateEntry={false}>
            <View style={{ gap: 6 }}>
              <Text className="font-display font-extrabold" style={{ fontSize: 56, lineHeight: 60, color: tactile.primary }}>
                {cert.score}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: tactile.ink }}>{cert.band}</Text>
              <Text style={{ fontSize: 15, color: tactile.muted }}>{languageName(cert.target_lang)}</Text>
              <Text style={{ fontSize: 14, color: tactile.muted }}>{cert.finished_at.slice(0, 10)}</Text>
              <View style={{ marginTop: 16, gap: 6 }}>
                {sections.map(([label, value]) => (
                  <Text key={label} style={{ fontSize: 15, color: tactile.body }}>{`${label} ${value}`}</Text>
                ))}
              </View>
            </View>
          </TactileCard>
        ) : null}
      </View>
    </ScrollView>
  );
}
