import { Redirect } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import {
  Badge,
  Button,
  Card,
  Chip,
  Medal,
  ProgressBar,
  Sheet,
  StatCard,
  StatPill,
  TextField,
  TrailNode,
} from "@/components/ui";
import { useTheme } from "@/theme/ThemeContext";

export default function DevUiScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <DevUiGallery />;
}

function DevUiGallery() {
  const { scheme, setPreference } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chipSelected, setChipSelected] = useState("a1");
  const [inputValue, setInputValue] = useState("");

  return (
    <ScrollView className="flex-1 bg-paper p-6 lg:p-12" contentContainerStyle={{ paddingBottom: 64 }}>
      <View className="max-w-4xl mx-auto w-full gap-8">
        {/* Header com interruptor de tema */}
        <View className="flex-row items-center justify-between pb-6 border-b border-line">
          <View>
            <Text className="font-display text-3xl font-bold text-ink">Catálogo de UI Prosa</Text>
            <Text className="text-sm text-muted mt-1">Design System Editorial Lúdico — Teste de Componentes</Text>
          </View>
          <Button
            variant="secondary"
            size="md"
            onPress={() => setPreference(scheme === "dark" ? "light" : "dark")}
          >
            {scheme === "dark" ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
          </Button>
        </View>

        {/* 1. Botões 3D */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">1. Botões 3D</Text>
          <View className="flex-row flex-wrap gap-3 items-center">
            <Button variant="primary" size="md">Primário (MD)</Button>
            <Button variant="primary" size="lg">Primário (LG)</Button>
            <Button variant="success">Sucesso 3D</Button>
            <Button variant="danger">Erro / Perigo</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="primary" disabled>Desabilitado</Button>
            <Button variant="primary" loading>Carregando</Button>
          </View>
        </View>

        {/* 2. Cards */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">2. Cards</Text>
          <View className="flex-row flex-wrap gap-4">
            <Card variant="base" className="flex-1 min-w-[200px]">
              <Text className="font-label text-base text-ink">Card Base</Text>
              <Text className="text-xs text-muted mt-1">Superfície padrão limpa para conteúdos.</Text>
            </Card>

            <Card variant="interactive" className="flex-1 min-w-[200px]" onPress={() => {}}>
              <Text className="font-label text-base text-ink">Card Interativo 3D</Text>
              <Text className="text-xs text-muted mt-1">Pressione para sentir a elevação e clique.</Text>
            </Card>

            <Card variant="selected" className="flex-1 min-w-[200px]">
              <Text className="font-label text-base text-xp">Card Selecionado</Text>
              <Text className="text-xs text-muted mt-1">Borda em destaque e fundo tonal.</Text>
            </Card>
          </View>
        </View>

        {/* 3. Barras de Progresso */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">3. Barras de Progresso</Text>
          <View className="gap-3 bg-card p-5 rounded-2xl border border-line">
            <Text className="text-xs font-label text-muted">Contínua (Primária - 65%):</Text>
            <ProgressBar value={0.65} tone="primary" size="md" />

            <Text className="text-xs font-label text-muted mt-2">Contínua (XP - 80%):</Text>
            <ProgressBar value={0.8} tone="xp" size="lg" />

            <Text className="text-xs font-label text-muted mt-2">Segmentada (Fases da Lição de 20 min):</Text>
            <ProgressBar
              segments={[
                { key: "1", state: "done" },
                { key: "2", state: "done" },
                { key: "3", state: "active", value: 0.6 },
                { key: "4", state: "todo" },
                { key: "5", state: "todo" },
              ]}
              tone="primary"
            />
          </View>
        </View>

        {/* 4. StatPills e StatCards */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">4. Estatísticas & Gamificação</Text>
          <View className="flex-row flex-wrap gap-2 items-center mb-2">
            <StatPill icon={<Icon name="flame" color="#F59E0B" size={16} />} value={12} label="dias" tone="streak" />
            <StatPill icon={<Icon name="bolt" color="#2563EB" size={16} />} value={340} label="XP" tone="xp" />
            <StatPill icon={<Icon name="brain" color="#C2410C" size={16} />} value={18} label="revisões" tone="primary" />
          </View>

          <View className="flex-row flex-wrap gap-3">
            <StatCard icon={<Icon name="flame" color="#F59E0B" size={28} />} value="12" label="Ofensiva" />
            <StatCard icon={<Icon name="bolt" color="#2563EB" size={28} />} value="2.340" label="XP Total" />
            <StatCard icon={<Icon name="brain" color="#15803D" size={28} />} value="148" label="Cartas SRS" />
            <StatCard icon={<Icon name="mic" color="#C2410C" size={28} />} value="94%" label="Melhor Fala" />
          </View>
        </View>

        {/* 5. Badges, Chips e Medalhas */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">5. Badges, Chips & Medalhas</Text>
          <View className="flex-row flex-wrap gap-2 items-center">
            <Badge tone="primary">NOVO</Badge>
            <Badge tone="success">CONCLUÍDO</Badge>
            <Badge tone="streak">OFENSIVA</Badge>
            <Badge tone="xp">+10 XP</Badge>
            <Badge tone="danger">CORREÇÃO</Badge>
            <Badge tone="muted">B1 INTERMEDIÁRIO</Badge>
          </View>

          <View className="flex-row flex-wrap gap-2 items-center mt-2">
            {["a1", "a2", "b1", "b2"].map((level) => (
              <Chip
                key={level}
                label={`Nível ${level.toUpperCase()}`}
                selected={chipSelected === level}
                onPress={() => setChipSelected(level)}
              />
            ))}
          </View>

          <View className="flex-row flex-wrap gap-4 mt-2">
            <Medal icon={<Icon name="flame" color="#FFFFFF" size={32} />} title="Primeira Fogueira" unlocked />
            <Medal icon={<Icon name="star" color="#FFFFFF" size={32} />} title="Semana Completa" unlocked />
            <Medal icon={<Icon name="crown" color="#7C3AED" size={32} />} title="Mestre da Prosa" unlocked={false} description="Complete 30 lições" />
          </View>
        </View>

        {/* 6. Nós da Trilha */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">6. Nós da Trilha de Aprendizado</Text>
          <View className="flex-row flex-wrap items-center justify-around bg-card p-6 rounded-2xl border border-line">
            <TrailNode state="done" title="Segunda" subtitle="No Mercado" />
            <TrailNode state="done" title="Terça" subtitle="Entrevista" />
            <TrailNode state="today" title="HOJE" subtitle="Café em Londres" />
            <TrailNode state="locked" title="Amanhã" subtitle="Bloqueado" />
            <TrailNode state="special" title="Reconstrução" subtitle="Dia 3" />
          </View>
        </View>

        {/* 7. Input / TextField */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">7. Campos de Entrada (TextField)</Text>
          <Card className="max-w-md">
            <TextField
              label="E-mail de acesso"
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="seu@email.com"
              email
            />
            <TextField
              label="Senha secreta"
              value="minhasenha123"
              onChangeText={() => {}}
              secure
              helper="Mínimo de 8 caracteres com letras e números."
            />
            <TextField
              label="Campo com erro de validação"
              value="código errado"
              onChangeText={() => {}}
              error="Código inválido ou expirado. Tente novamente."
            />
          </Card>
        </View>

        {/* 8. Sheet / Modal Adaptativo */}
        <View className="gap-3">
          <Text className="font-display text-xl font-bold text-ink">8. Modal / Bottom Sheet Adaptativo</Text>
          <Button variant="primary" onPress={() => setSheetOpen(true)}>
            Abrir Modal de Teste
          </Button>

          <Sheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Resumo da Sessão"
            footer={
              <Button fullWidth variant="success" onPress={() => setSheetOpen(false)}>
                Continuar Aprendizado
              </Button>
            }
          >
            <Text className="text-base text-ink leading-6">
              Este componente renderiza como um Modal flutuante elegante no desktop/tablet e como um Bottom Sheet nativo no mobile.
            </Text>
          </Sheet>
        </View>
      </View>
    </ScrollView>
  );
}
