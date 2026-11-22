import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Platform, ScrollView, Text, View } from "react-native";
import { Card, DossierCore, fill } from "@/components/dossier/dossier-parts";
import { ProsaLogo } from "@/components/ProsaLogo";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { BodyText } from "@/features/shell/tactile-page";
import { fetchPublicDossier } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { DOSSIER } from "@/lib/copy/dossier";
import { DOSSIER_PUBLIC } from "@/lib/copy/dossier-public";

/** Dossiê público: página limpa e imprimível, sem o shell do app e sem login. */
export default function PublicDossierPage() {
  const t = useAreaCopy(DOSSIER_PUBLIC);
  const d = useAreaCopy(DOSSIER);
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const query = useQuery({
    queryKey: ["dossier-public", token],
    queryFn: () => fetchPublicDossier(token),
    enabled: token.length > 0,
    retry: false,
  });
  const data = query.data;
  const missing = !token || query.isError;

  return (
    <ScrollView testID="dossier-public" style={{ flex: 1, backgroundColor: tactile.bg }} contentContainerStyle={{ flexGrow: 1, paddingVertical: 32, paddingBottom: 64 }}>
      <View style={{ width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 16, gap: 20 }}>
        <View style={{ alignItems: "center" }}>
          <ProsaLogo variant="full" href="/" />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: tactile.primaryInk }}>{t.kicker}</Text>
          <Text accessibilityRole="header" style={{ fontFamily: tactile.serif, fontSize: 34, lineHeight: 40, fontWeight: "600", color: tactile.ink }}>
            {t.title}
          </Text>
          <Text style={{ fontFamily: tactile.font, fontSize: 16, lineHeight: 24, color: tactile.muted }}>{t.dek}</Text>
        </View>

        {query.isLoading ? <BodyText tone="muted" testID="dossier-public-loading">{t.loading}</BodyText> : null}

        {missing ? (
          <TactilePanel testID="dossier-public-missing">
            <Text accessibilityRole="alert" style={{ fontFamily: tactile.font, fontSize: 16, lineHeight: 24, color: tactile.danger }}>
              {t.missing}
            </Text>
          </TactilePanel>
        ) : null}

        {data ? (
          <>
            <DossierCore data={data} />
            <Card title={d.checkpointsTitle} icon="check" testID="dossier-public-checkpoints">
              {data.checkpoints.length === 0 ? <BodyText tone="muted">{d.checkpointsNone}</BodyText> : null}
              {data.checkpoints.map((item) => (
                <View key={item.id} style={{ gap: 4, backgroundColor: tactile.raised, borderRadius: 14, padding: 12 }}>
                  <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "800", color: tactile.ink }}>{item.focus}</Text>
                  {item.note ? <BodyText tone="muted">{item.note}</BodyText> : null}
                  {item.due_on ? <BodyText tone="muted">{fill(d.due, { date: item.due_on })}</BodyText> : null}
                  {item.done ? <BodyText tone="ink">{d.done}</BodyText> : null}
                </View>
              ))}
            </Card>
            {Platform.OS === "web" ? (
              <View style={{ alignSelf: "flex-start" }}>
                <TactileButton testID="dossier-public-print" label={t.print} variant="secondary" size="sm" onPress={() => window.print()} />
              </View>
            ) : null}
          </>
        ) : null}

        <View style={{ alignItems: "center", gap: 2, paddingTop: 12 }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.muted }}>{t.footer}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
