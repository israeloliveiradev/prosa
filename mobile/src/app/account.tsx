import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { useTheme } from "@/theme/ThemeContext";
import type { AccountUser } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { setPro } from "@/lib/progress";
import { signIn, signOut, signUp, useSession } from "@/lib/session";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function accountMessage(message: string): string {
  if (message.includes("Invalid credentials")) {
    return "E-mail ou senha não confere.";
  }
  if (message.includes("Email already registered")) {
    return "Este e-mail já tem uma conta.";
  }
  if (message.includes("Invalid request")) {
    return "Confira o e-mail e use uma senha com pelo menos 8 caracteres.";
  }
  return message;
}

export default function AccountScreen() {
  const { palette } = useTheme();
  const session = useSession();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<AccountUser["level"]>("A2");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    void tap("medium");
    setPending(true);
    setError(null);
    try {
      const user = creating
        ? await signUp({ email, password, native_lang: "pt", target_lang: "en", level })
        : await signIn(email, password);
      setPro(user.plan === "pro");
      setPassword("");
    } catch (caught) {
      setError(accountMessage(caught instanceof Error ? caught.message : "Não foi possível entrar."));
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    void tap("light");
    setPending(true);
    try {
      await signOut();
      setPro(false);
    } finally {
      setPending(false);
    }
  }

  if (session) {
    const plan = session.user.plan === "pro" ? "Prosa Pro" : "Edição grátis";
    return (
      <AppFrame>
        <Text className="font-label text-xs uppercase tracking-widest text-ember">Conta</Text>
        <Text className="font-displayItalic mt-4 text-display text-ink">{session.user.email}</Text>
        <Text className="mt-4 text-lg leading-7 text-muted">
          {plan}. Estuda {session.user.target_lang.toUpperCase()} no nível {session.user.level}, a partir de{" "}
          {session.user.native_lang.toUpperCase()}.
        </Text>
        <Text className="mt-6 max-w-xl text-base leading-7 text-ink">
          O deck deste aparelho sincroniza com esta conta quando a rede volta.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/quiz")} className="mt-8 min-h-12 cursor-pointer justify-center self-start">
          <Text className="font-label text-base text-ink">Idioma e interesses</Text>
          <Text className="text-sm text-muted">A prosa passa a falar do que você escolheu</Text>
        </Pressable>
        <ChunkButton className="mt-8 w-full max-w-xs" label={pending ? "Saindo" : "Sair"} onPress={() => void leave()} disabled={pending} tone="ghost" />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">Conta</Text>
      <Text className="font-displayItalic mt-4 text-display text-ink">{creating ? "Criar a conta." : "Entrar."}</Text>
      <Text className="mt-4 max-w-xl text-lg leading-7 text-muted">
        A prosa do dia continua neste aparelho. A conta guarda o deck e a assinatura.
      </Text>

      <View className="mt-10 max-w-md gap-5">
        <View>
          <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ana@exemplo.com"
            placeholderTextColor={palette.onSurfaceVariant}
            className="min-h-14 rounded-full bg-card px-5 text-base text-ink"
          />
        </View>
        <View>
          <Text className="mb-2 font-label text-xs uppercase tracking-widest text-muted">Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Senha"
            secureTextEntry
            autoComplete={creating ? "new-password" : "password"}
            placeholder="No mínimo 8 caracteres"
            placeholderTextColor={palette.onSurfaceVariant}
            className="min-h-14 rounded-full bg-card px-5 text-base text-ink"
          />
        </View>
        {creating ? (
          <View>
            <Text className="font-label text-xs uppercase tracking-widest text-muted">Nível</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {LEVELS.map((item) => {
                const selected = item === level;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setLevel(item)}
                    className={`h-12 w-12 items-center justify-center rounded-full ${selected ? "bg-ember" : "bg-card"}`}
                  >
                    <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-3 text-sm leading-5 text-muted">A primeira prosa é em inglês, com o português como língua de casa.</Text>
          </View>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-base leading-6 text-roseInk">
            {error}
          </Text>
        ) : null}
        <ChunkButton
          className="mt-2 w-full"
          label={pending ? "Abrindo" : creating ? "Criar conta" : "Entrar"}
          onPress={() => {
            if (email.trim().length === 0 || !email.includes("@") || password.length < 8) {
              setError("Confira o e-mail e use uma senha com pelo menos 8 caracteres.");
              return;
            }
            void submit();
          }}
          disabled={pending}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCreating((value) => !value);
            setError(null);
          }}
          className="min-h-12 cursor-pointer justify-center"
        >
          <Text className="font-label text-base text-ink">{creating ? "Já tenho conta" : "Ainda não tenho conta"}</Text>
        </Pressable>
      </View>
    </AppFrame>
  );
}
