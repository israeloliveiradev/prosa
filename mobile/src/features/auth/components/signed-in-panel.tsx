import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ListRow } from "@/ui/list-row";
import { Button } from "@/ui/button";
import { Text } from "@/ui/text";
import { Pill } from "@/ui/pill";
import { useCopy } from "@/lib/i18n";
import type { AccountUser } from "@/api/schemas/auth";

export interface SignedInPanelProps {
  user: AccountUser;
  onSignOut: () => void;
  pending: boolean;
}

export function SignedInPanel({ user, onSignOut, pending }: SignedInPanelProps) {
  const router = useRouter();
  const copy = useCopy();

  return (
    <View style={{ gap: 24 }}>
      {/* Cabeçalho do perfil autenticado */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="title">
            {user.display_name || user.email}
          </Text>
          <Pill
            label={user.plan === "pro" ? "Prosa Pro" : "Edição Grátis"}
            tone={user.plan === "pro" ? "positive" : "neutral"}
          />
        </View>
        <Text variant="body" tone="muted">
          {user.email}
        </Text>
      </View>

      {/* Atalhos de conta */}
      <View style={{ gap: 2 }}>
        <ListRow
          title={copy.settings ?? "Ajustes da conta"}
          subtitle="Aparência, lembrete diário e segurança"
          onPress={() => router.push("/settings" as Href)}
        />
        <ListRow
          title={copy.languageInterests ?? "Idiomas e interesses"}
          subtitle="Trocar idioma de estudo e temas de notícia"
          onPress={() => router.push("/quiz")}
        />
        {user.role === "admin" ? (
          <ListRow
            title={copy.admin ?? "Administração"}
            subtitle="Métricas globais, contas e controle da IA"
            onPress={() => router.push("/admin")}
          />
        ) : null}
      </View>

      {/* Ação de encerramento de sessão */}
      <Button
        label={pending ? "Encerrando..." : (copy.signOut ?? "Sair da conta")}
        variant="secondary"
        size="lg"
        loading={pending}
        disabled={pending}
        onPress={onSignOut}
        testID="account-signout"
        fullWidth
      />
    </View>
  );
}
