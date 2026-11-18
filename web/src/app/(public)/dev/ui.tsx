import React, { useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import {
  Text,
  Icon,
  Button,
  IconButton,
  TextAction,
  Card,
  Well,
  Surface,
  Field,
  OtpField,
  Segmented,
  Tabs,
  Switch,
  Checkbox,
  RadioGroup,
  Chip,
  Select,
  Pill,
  ListRow,
  Table,
  KpiStrip,
  Progress,
  Skeleton,
  EmptyState,
  InlineError,
  Sheet,
  Dialog,
  Popover,
  Menu,
  Tooltip,
  toast,
  Avatar,
  Flag,
  PageHeader,
  Stepper,
  Kbd,
} from "@/ui";
import { useThemeTokens, useTheme } from "@/theme/ThemeContext";

export default function DevUiGallery() {
  const { colors, spacing } = useThemeTokens();
  const { preference, setPreference } = useTheme();

  // Interactive states
  const [fieldValue, setFieldValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [segmentedVal, setSegmentedVal] = useState("all");
  const [tabVal, setTabVal] = useState("tab1");
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [radioVal, setRadioVal] = useState("opt1");
  const [chipSelected, setChipSelected] = useState(true);
  const [selectVal, setSelectVal] = useState("pt");

  // Modal / Overlays
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ScrollView
      testID="ui-gallery-scroll"
      style={{ flex: 1, backgroundColor: colors.surface.page }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 }}
    >
      <View style={{ maxWidth: 960, width: "100%", alignSelf: "center", gap: 36 }}>
        {/* Gallery Header */}
        <PageHeader
          title="Galeria de Primitivos UI"
          description="Design System Editorial Prosa — Catálogo de Componentes e Testes"
          actions={
            <Segmented
              value={preference}
              onChange={(val) => setPreference(val as any)}
              options={[
                { value: "system", label: "Sistema" },
                { value: "light", label: "Claro" },
                { value: "dark", label: "Escuro" },
              ]}
              testID="gallery-theme-switcher"
            />
          }
        />

        {/* Grupo 1: Tipografia & Mídia */}
        <Card testID="section-typography" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 1: Tipografia & Mídia
          </Text>
          <View style={{ gap: 12 }}>
            <Text variant="display-lg" color="primary">Display LG — Prosa</Text>
            <Text variant="display-sm" color="primary">Display SM — Leitura Diária</Text>
            <Text variant="heading-lg" color="primary">Heading LG — Capítulo Um</Text>
            <Text variant="heading-sm" color="primary">Heading SM — Seção Analítica</Text>
            <Text variant="body-lg" color="primary">Body LG — Texto de parágrafo editorial com alto contraste e clareza.</Text>
            <Text variant="body-md" color="secondary">Body MD — Explicação complementar secundária.</Text>
            <Text variant="body-sm" color="secondary">Body SM — Nota de rodapé ou detalhe.</Text>
            <Text variant="caption" color="disabled">Caption — Metadata e rótulos auxiliares.</Text>
          </View>
          <View style={[styles.row, { marginTop: spacing.md }]}>
            <Icon name="check" size={20} color={colors.status.positive} />
            <Icon name="x" size={20} color={colors.status.negative} />
            <Icon name="chevron-right" size={20} color={colors.text.secondary} />
            <Icon name="settings" size={20} color={colors.text.secondary} />
            <Icon name="book" size={20} color={colors.accent.brand} />
          </View>
        </Card>

        {/* Grupo 2: Ações */}
        <Card testID="section-actions" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 2: Ações
          </Text>
          <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
            <Button variant="primary" tone="brand" testID="btn-primary-brand">
              Primário Brand
            </Button>
            <Button variant="primary" tone="neutral" testID="btn-primary-neutral">
              Primário Neutral
            </Button>
            <Button variant="primary" tone="negative" testID="btn-primary-negative">
              Destrutivo
            </Button>
            <Button variant="secondary" tone="neutral" testID="btn-secondary">
              Secundário
            </Button>
            <Button variant="ghost" tone="neutral" testID="btn-ghost">
              Ghost
            </Button>
            <Button variant="primary" loading testID="btn-loading">
              Carregando
            </Button>
            <Button variant="primary" disabled testID="btn-disabled">
              Desabilitado
            </Button>
          </View>

          <View style={[styles.row, { marginTop: spacing.md, gap: 12 }]}>
            <IconButton icon="settings" variant="secondary" size="md" accessibilityLabel="Config" />
            <IconButton icon="x" variant="ghost" size="md" accessibilityLabel="Fechar" />
            <TextAction onPress={() => {}} testID="action-text-retry">
              Ação em Texto Simples
            </TextAction>
            <TextAction onPress={() => {}} tone="negative" testID="action-text-destruct">
              Ação Texto Destrutiva
            </TextAction>
          </View>
        </Card>

        {/* Grupo 3: Superfícies */}
        <Card testID="section-surfaces" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 3: Superfícies & Contêineres
          </Text>
          <View style={{ gap: 12 }}>
            <Surface tone="sheet" style={{ padding: spacing.md }}>
              <Text variant="body-md" color="primary">Surface Flat (Plana)</Text>
            </Surface>
            <Surface tone="raised" style={{ padding: spacing.md }}>
              <Text variant="body-md" color="primary">Surface Raised (Elevada)</Text>
            </Surface>
            <Well>
              <Text variant="body-md" color="secondary">Well — Contêiner de recesso para metadados ou citações.</Text>
            </Well>
          </View>
        </Card>

        {/* Grupo 4: Entradas & Formulários */}
        <Card testID="section-inputs" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 4: Entradas & Formulários
          </Text>
          <View style={{ gap: 16 }}>
            <Field
              label="E-mail"
              placeholder="exemplo@prosa.app"
              value={fieldValue}
              onChangeText={(txt) => {
                setFieldValue(txt);
                if (fieldError) setFieldError(null);
              }}
              error={fieldError}
              hint="Usado para sincronizar seu progresso."
              testID="gallery-field-email"
            />
            <View style={styles.row}>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setFieldError("Endereço de e-mail inválido.")}
                testID="gallery-trigger-error"
              >
                Simular Erro
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setFieldError(null)}
                testID="gallery-clear-error"
              >
                Limpar Erro
              </Button>
            </View>

            <Field
              label="Senha"
              placeholder="••••••••"
              kind="password"
              testID="gallery-field-password"
            />

            <OtpField
              value={otpValue}
              onChange={setOtpValue}
              length={6}
              testID="gallery-otp-field"
            />

            <View style={{ gap: 8 }}>
              <Text variant="caption" weight="medium" color="secondary">
                Segmented Control
              </Text>
              <Segmented
                value={segmentedVal}
                onChange={setSegmentedVal}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "unread", label: "Não lidos" },
                  { value: "starred", label: "Favoritos" },
                ]}
                testID="gallery-segmented"
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text variant="caption" weight="medium" color="secondary">
                Tabs
              </Text>
              <Tabs
                value={tabVal}
                onChange={setTabVal}
                tabs={[
                  { id: "tab1", label: "Geral" },
                  { id: "tab2", label: "Avançado", count: 2 },
                  { id: "tab3", label: "Histórico" },
                ]}
                testID="gallery-tabs"
              />
            </View>

            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Switch
                label="Ativar notificações"
                value={switchVal}
                onChange={setSwitchVal}
                testID="gallery-switch"
              />
            </View>

            <Checkbox
              checked={checkboxVal}
              onChange={setCheckboxVal}
              label="Concordo com os termos do aplicativo"
              testID="gallery-checkbox"
            />

            <RadioGroup
              value={radioVal}
              onChange={setRadioVal}
              options={[
                { value: "opt1", label: "Plano Diário (20 min)" },
                { value: "opt2", label: "Plano Intensivo (40 min)" },
              ]}
              testID="gallery-radiogroup"
            />

            <View style={styles.row}>
              <Chip
                label="Filtro Gramática"
                selected={chipSelected}
                onPress={() => setChipSelected(!chipSelected)}
                testID="gallery-chip"
              />
            </View>

            <Select
              label="Idioma da Lição"
              value={selectVal}
              onChange={setSelectVal}
              options={[
                { value: "pt", label: "Português (Brasil)" },
                { value: "en", label: "Inglês (UK)" },
                { value: "es", label: "Espanhol" },
              ]}
              testID="gallery-select"
            />
          </View>
        </Card>

        {/* Grupo 5: Exibição de Dados & Feedback */}
        <Card testID="section-data" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 5: Exibição de Dados & Feedback
          </Text>
          <View style={{ gap: 16 }}>
            <View style={[styles.row, { gap: 8, flexWrap: "wrap" }]}>
              <Pill tone="neutral">Pill Neutra</Pill>
              <Pill tone="accent">Pill Accent</Pill>
              <Pill tone="positive">Sucesso</Pill>
              <Pill tone="negative">Atenção</Pill>
            </View>

            <ListRow
              title="Capítulo 3: Verbos Irregulares"
              subtitle="Concluído há 2 dias • 95% de precisão"
              chevron
              onPress={() => {}}
              testID="gallery-list-row"
            />

            <KpiStrip
              items={[
                { label: "Sequência", value: "14 dias" },
                { label: "Precisão", value: "98%" },
                { label: "Lições", value: "42" },
              ]}
              testID="gallery-kpi-strip"
            />

            <Progress value={65} labelStart="Progresso diário" labelEnd="65%" testID="gallery-progress" />

            <View style={{ gap: 6 }}>
              <Skeleton width="100%" height={16} testID="gallery-skeleton-1" />
              <Skeleton width="75%" height={16} testID="gallery-skeleton-2" />
            </View>

            <InlineError
              message="Falha de sincronização com o servidor de dados."
              onRetry={() => toast.show({ message: "Tentando novamente...", tone: "info" })}
              testID="gallery-inline-error"
            />

            <Table
              columns={[
                { key: "mind", header: "Autor", flex: 2 },
                { key: "slot", header: "Fase", flex: 1 },
                { key: "status", header: "Status", flex: 1 },
              ]}
              rows={[
                { id: "1", mind: "Einstein", slot: "Leitura", status: "Ativo" },
                { id: "2", mind: "Curie", slot: "Memória", status: "Pendente" },
                { id: "3", mind: "Feynman", slot: "Fala", status: "Concluído" },
              ]}
              testID="gallery-table"
            />

            <EmptyState
              icon="book"
              title="Nenhuma lição salva"
              description="Você ainda não adicionou nenhum capítulo à sua lista de leitura diária."
              action={{
                label: "Explorar catálogo",
                onPress: () => toast.show("Navegar catálogo"),
              }}
              testID="gallery-empty-state"
            />
          </View>
        </Card>

        {/* Grupo 6: Overlays & Feedback Interativo */}
        <Card testID="section-overlays" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 6: Overlays & Feedback
          </Text>
          <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
            <Button
              variant="secondary"
              onPress={() => setSheetOpen(true)}
              testID="gallery-trigger-sheet"
            >
              Abrir Sheet
            </Button>
            <Button
              variant="secondary"
              onPress={() => setDialogOpen(true)}
              testID="gallery-trigger-dialog"
            >
              Abrir Dialog
            </Button>
            <Button
              variant="secondary"
              onPress={() => setPopoverOpen(true)}
              testID="gallery-trigger-popover"
            >
              Abrir Popover
            </Button>
            <Button
              variant="secondary"
              onPress={() => setMenuOpen(true)}
              testID="gallery-trigger-menu"
            >
              Abrir Menu
            </Button>
            <Tooltip content="Dica visual de atalho">
              <Button variant="ghost">Hover Tooltip</Button>
            </Tooltip>
          </View>

          <View style={{ marginTop: spacing.md, gap: 8 }}>
            <Text variant="caption" weight="medium" color="secondary">
              Disparar Toasts:
            </Text>
            <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => toast.show({ message: "Informação do sistema", tone: "info" })}
                testID="gallery-toast-info"
              >
                Toast Info
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => toast.show({ message: "Operação realizada com sucesso!", tone: "positive" })}
                testID="gallery-toast-positive"
              >
                Toast Sucesso
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => toast.show({ message: "Erro ao processar requisição", tone: "negative" })}
                testID="gallery-toast-negative"
              >
                Toast Erro
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => toast.show({ message: "Aviso de armazenamento quase cheio", tone: "warning" })}
                testID="gallery-toast-warning"
              >
                Toast Aviso
              </Button>
            </View>
          </View>

          <Sheet
            visible={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Painel Lateral / Sheet"
            description="Exemplo de gaveta modal responsiva."
            testID="gallery-sheet-modal"
          >
            <Text variant="body-md" color="primary">
              Este conteúdo se adapta: bottom-sheet no celular, gaveta lateral no desktop.
            </Text>
          </Sheet>

          <Dialog
            visible={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Confirmar exclusão?"
            description="Esta ação removerá permanentemente seu histórico de lições do dispositivo."
            tone="negative"
            confirmAction={{
              label: "Excluir",
              onPress: () => {
                setDialogOpen(false);
                toast.show({ message: "Histórico excluído", tone: "negative" });
              },
            }}
            cancelAction={{
              label: "Cancelar",
              onPress: () => setDialogOpen(false),
            }}
            testID="gallery-dialog-modal"
          />

          <Popover
            visible={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            testID="gallery-popover-card"
          >
            <Text variant="heading-sm" color="primary">Popover Informativo</Text>
            <Text variant="body-sm" color="secondary" style={{ marginTop: 4 }}>
              Card posicionado que fecha com ESC ou clique fora.
            </Text>
          </Popover>

          <Menu
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            entries={[
              { id: "edit", label: "Editar perfil", icon: "settings", onPress: () => {} },
              { id: "share", label: "Compartilhar", icon: "book", onPress: () => {} },
              { type: "divider" },
              { id: "del", label: "Excluir conta", icon: "x", destructive: true, onPress: () => {} },
            ]}
            testID="gallery-menu-card"
          />
        </Card>

        {/* Grupo 7: Identidade & Estrutura */}
        <Card testID="section-identity" style={styles.sectionCard}>
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.md }}>
            Grupo 7: Identidade & Estrutura
          </Text>
          <View style={[styles.row, { gap: 12, alignItems: "center" }]}>
            <Avatar name="Albert Einstein" slot="reading" size="lg" />
            <Avatar name="Marie Curie" slot="memory" size="md" />
            <Avatar name="Richard Feynman" slot="speech" size="sm" />
            <Flag code="pt" size={32} />
            <Flag code="en" size={32} />
            <Flag code="es" size={32} />
            <Kbd shortcut={["⌘", "K"]} />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Stepper currentStep={2} totalSteps={5} />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: 24,
    borderRadius: 16,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
