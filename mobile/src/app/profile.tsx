import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Medal } from "@/components/ui/medal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { BADGES, useProgress } from "@/lib/progress";
import { languageName } from "@/lib/languages";
import { givenName } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useXp } from "@/lib/xp";
import { calculate360Status } from "@/services/fluency-360";
import { FluencyMeterCard } from "@/components/home/fluency-meter-card";
import { PlacementCard } from "@/components/home/placement-card";

export default function ProfileScreen() {
  const session = useSession();
  const progress = useProgress();
  const { total } = useXp();
  const [durationMode, setDurationMode] = useState<"lite_20" | "pro_40" | "sprint_60">("lite_20");

  if (!session) {
    return <Redirect href="/account" />;
  }

  const name = givenName(session.user.email, session.user.display_name);
  const targetLang = languageName(session.user.target_lang ?? "en");
  const nativeLang = languageName(session.user.native_lang ?? "pt");
  const initial = name.slice(0, 1).toUpperCase();

  const masteredCards = progress.cards.filter((c) => c.status === "mastered").length;
  const fluencyStatus = calculate360Status(0);

  // Aside contextual para o RightRail
  const asideContent = (
    <View className="gap-4">
      <Card variant="base" padding="md" className="gap-2">
        <Text className="font-label text-xs uppercase tracking-wider text-muted">Diagnóstico</Text>
        <Text className="font-display text-lg font-bold text-ink">Nível CEFR: {session.user.level ?? "A2"}</Text>
        <Text className="text-xs text-muted leading-4">
          Baseado no seu teste de nivelamento adaptativo mais recente.
        </Text>
        <Button variant="secondary" size="md" fullWidth onPress={() => router.push("/placement")}>
          Refazer Teste
        </Button>
      </Card>
    </View>
  );

  return (
    <Page
      title="Perfil do Aprendiz"
      subtitle={`Estudando ${targetLang} através de ${nativeLang}`}
      aside={asideContent}
    >
      <View className="gap-8">
        {/* 1. Header do Perfil com Avatar e Dados */}
        <Card variant="base" padding="lg" className="flex-col md:flex-row items-center md:items-start gap-6">
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center border-4 border-primarySoft shadow-sm">
            <Text className="font-heavy text-3xl text-onPrimary">{initial}</Text>
          </View>
          <View className="flex-1 items-center md:items-start">
            <Text className="font-display text-2xl font-bold text-ink">{name}</Text>
            <Text className="text-sm text-muted mt-0.5">{session.user.email}</Text>
            <View className="flex-row items-center gap-2 mt-3">
              <View className="px-3 py-1 rounded-full bg-primarySoft">
                <Text className="font-label text-xs text-primary font-bold">
                  Nível {session.user.level ?? "A2"}
                </Text>
              </View>
              {progress.pro ? (
                <View className="px-3 py-1 rounded-full bg-pro/10 border border-pro/20">
                  <Text className="font-label text-xs text-pro font-bold">Prosa Pro</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Button variant="secondary" size="md" onPress={() => router.push("/settings")}>
            Configurações
          </Button>
        </Card>

        {/* 2. Quatro Métricas Principais (StatCards) */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">Estatísticas Gerais</Text>
          <View className="flex-row flex-wrap gap-3">
            <StatCard
              icon={<Icon name="flame" color="#F59E0B" size={28} />}
              value={progress.streakCount}
              label="Dias Ofensiva"
            />
            <StatCard
              icon={<Icon name="bolt" color="#2563EB" size={28} />}
              value={total}
              label="XP Acumulado"
            />
            <StatCard
              icon={<Icon name="brain" color="#15803D" size={28} />}
              value={masteredCards}
              label="Palavras no SRS"
            />
            <StatCard
              icon={<Icon name="mic" color="#C2410C" size={28} />}
              value={`${progress.speakingBest || 88}%`}
              label="Acurácia de Fala"
            />
          </View>
        </View>

        {/* 3. Fluência 360H */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">Meta de Fluência (360 Horas)</Text>
          <FluencyMeterCard
            status={fluencyStatus}
            durationMode={durationMode}
            onChangeDurationMode={(mode) => setDurationMode(mode)}
          />
        </View>

        {/* 4. Conquistas & Medalhas */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">Medalhas & Selos</Text>
          <Card variant="base" padding="md">
            <View className="flex-row flex-wrap justify-around">
              {BADGES.map((b) => {
                const unlocked = progress.badges.includes(b.code);
                return (
                  <Medal
                    key={b.code}
                    icon={<Icon name="star" color={unlocked ? "#FFFFFF" : "#5C534C"} size={26} />}
                    title={b.name}
                    description={b.description}
                    unlocked={unlocked}
                  />
                );
              })}
            </View>
          </Card>
        </View>

        {/* 5. Histórico Recente de Lições */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">Histórico de Lições</Text>
          {progress.history.length > 0 ? (
            <Card variant="base" padding="none">
              {progress.history.slice(0, 5).map((item, index) => (
                <View
                  key={`${item.date}-${index}`}
                  className={`p-4 flex-row items-center justify-between ${
                    index > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <View>
                    <Text className="font-label text-sm text-ink">{item.topic}</Text>
                    <Text className="text-xs text-muted mt-0.5">{item.date}</Text>
                  </View>
                  <Button
                    variant="ghost"
                    size="md"
                    onPress={() => router.push({ pathname: "/daily", params: { date: item.date, topic: item.topic } })}
                  >
                    Rever
                  </Button>
                </View>
              ))}
            </Card>
          ) : (
            <Card variant="base" padding="lg" className="items-center justify-center p-8">
              <Text className="text-sm text-muted text-center">
                Você ainda não concluiu lições. Complete sua primeira sessão de 20 minutos hoje!
              </Text>
            </Card>
          )}
        </View>
      </View>
    </Page>
  );
}
