import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View, Linking } from "react-native";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { Panel } from "@/components/shell/panel";
import { useTheme } from "@/theme/ThemeContext";
import type { AccountUser } from "@/lib/api";
import { confirmPasswordReset, requestPasswordReset, resendAccountEmail } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { setPro } from "@/lib/progress";
import { finishSignIn, finishVerify, signIn, signOut, signUp, useSession } from "@/lib/session";
import { keepWords } from "@/lib/text";

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
  if (message.includes("Verify code expired")) {
    return "O código expirou ou não confere. Peça outro.";
  }
  if (message.includes("The verification letter did not leave") || message.includes("Mail is not configured")) {
    return "O e-mail de validação não saiu. Tente de novo em instantes.";
  }
  return message;
}

export default function AccountScreen() {
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();
  const [creating, setCreating] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [level, setLevel] = useState<AccountUser["level"]>("A2");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function submit() {
    void tap("medium");
    setPending(true);
    setError(null);
    try {
      if (creating) {
        const next = await signUp({ email, password, native_lang: "pt", target_lang: "en", level });
        if ("requires_verify" in next) {
          setVerifying(true);
          setNote(copy.verifyHint);
          setPassword("");
          return;
        }
        setPro(next.plan === "pro");
      } else if (verifying) {
        const user = await finishVerify(email, otp);
        setPro(user.plan === "pro");
        setVerifying(false);
      } else if (ticket) {
        const user = await finishSignIn(ticket, otp);
        setPro(user.plan === "pro");
        setTicket(null);
      } else {
        const next = await signIn(email, password);
        if ("requires_verify" in next) {
          setVerifying(true);
          setNote(copy.verifyHint);
          return;
        }
        if ("requires_2fa" in next) {
          setTicket(next.ticket);
          setNote(copy.secondFactor);
          return;
        }
        setPro(next.plan === "pro");
      }
      setPassword("");
      setOtp("");
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
        <PageMasthead
          kicker="Conta"
          title="A sua conta."
          dek={keepWords(`${session.user.email}. ${plan}. Estuda ${session.user.target_lang.toUpperCase()} no nível ${session.user.level}, a partir de ${session.user.native_lang.toUpperCase()}.`)}
        />
        <Text className="mt-6 max-w-xl text-base leading-7 text-ink">
          O deck deste aparelho sincroniza com esta conta quando a rede volta.
        </Text>
        <View className="mt-8 gap-3">
          <ActionRow title={copy.settings} detail="Nome, tema, senha, idioma da tela e lembretes." onPress={() => router.push("/settings" as Href)} />
          <ActionRow title="Como usar" detail="O caminho das telas e da prosa de vinte minutos." onPress={() => router.push("/guide")} />
          <ActionRow title="Idioma e interesses" detail="A prosa passa a falar do que você escolheu." onPress={() => router.push("/quiz")} />
          {session.user.role === "admin" ? (
            <ActionRow title="Administração" detail="Contas, planos e o movimento do dia." onPress={() => router.push("/admin")} />
          ) : null}
        </View>
        <ChunkButton className="mt-8 w-full max-w-xs" label={pending ? "Saindo" : "Sair"} onPress={() => void leave()} disabled={pending} tone="ghost" />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <PageMasthead
        kicker="Conta"
        title={verifying ? copy.verifyTitle : creating ? "Criar a conta." : "Entrar."}
        dek="A prosa do dia continua neste aparelho. A conta guarda o deck e a assinatura."
      />
      <View className="mt-6 max-w-md">
        <ActionRow title="Como usar" detail="O caminho das telas, mesmo antes de entrar." onPress={() => router.push("/guide")} />
      </View>

      <View className="mt-10 max-w-md">
        <Panel>
        <View className="gap-5">
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
            className="min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink"
          />
        </View>
        {forgot ? (
          <View className="gap-4">
            <Text className="text-base leading-7 text-muted">{copy.forgotHint}</Text>
            {note ? <Text className="text-base text-moss">{note}</Text> : null}
            <ChunkButton
              label={copy.sendReset}
              disabled={pending || !email.includes("@")}
              onPress={() => {
                setPending(true);
                setError(null);
                void requestPasswordReset(email)
                  .then(() => setNote(copy.forgotHint))
                  .catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : "O e-mail não saiu.");
                  })
                  .finally(() => setPending(false));
              }}
            />
            <TextInput
              value={resetCode}
              onChangeText={setResetCode}
              keyboardType="number-pad"
              accessibilityLabel={copy.resetCode}
              placeholder={copy.resetCode}
              placeholderTextColor={palette.onSurfaceVariant}
              className="min-h-14 rounded-2xl border border-line bg-card px-5 text-base text-ink"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel={copy.newPassword}
              placeholder={copy.newPassword}
              placeholderTextColor={palette.onSurfaceVariant}
              className="min-h-14 rounded-2xl border border-line bg-card px-5 text-base text-ink"
            />
            <ChunkButton
              label={copy.resetSave}
              disabled={pending || resetCode.length !== 6 || password.length < 8}
              onPress={() => {
                setPending(true);
                setError(null);
                void confirmPasswordReset(email, resetCode, password)
                  .then(() => {
                    setForgot(false);
                    setNote(copy.saved);
                    setPassword("");
                  })
                  .catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : "O código não conferiu.");
                  })
                  .finally(() => setPending(false));
              }}
            />
            <ChunkButton label="Voltar a entrar" tone="ghost" onPress={() => setForgot(false)} />
          </View>
        ) : null}
        {forgot || verifying ? null : (
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
            className="min-h-14 rounded-2xl border border-line bg-paper px-5 text-base text-ink"
          />
        </View>
        )}
        {creating && !forgot && !verifying ? (
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
        {verifying && !forgot ? (
          <View className="gap-4">
            <Text className="text-base leading-7 text-muted">{keepWords(copy.verifyHint)}</Text>
            {note ? <Text className="text-base text-moss">{keepWords(note)}</Text> : null}
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              accessibilityLabel={copy.resetCode}
              placeholder={copy.resetCode}
              placeholderTextColor={palette.onSurfaceVariant}
              className="min-h-14 rounded-2xl border border-line bg-card px-5 text-base text-ink"
            />
            <ChunkButton
              className="w-full"
              label={pending ? "Abrindo" : copy.verifySave}
              disabled={pending || otp.length !== 6}
              onPress={() => void submit()}
            />
            <ChunkButton
              className="w-full"
              label={copy.verifyAgain}
              tone="ghost"
              disabled={pending || !email.includes("@")}
              onPress={() => {
                setPending(true);
                setError(null);
                void resendAccountEmail(email)
                  .then(() => setNote(copy.verifyHint))
                  .catch((caught: unknown) => {
                    setError(accountMessage(caught instanceof Error ? caught.message : "O e-mail não saiu."));
                  })
                  .finally(() => setPending(false));
              }}
            />
            <ChunkButton
              className="w-full"
              label={copy.mailBox}
              tone="ghost"
              onPress={() => void Linking.openURL("http://localhost:8025")}
            />
            <ChunkButton
              label="Voltar"
              tone="ghost"
              onPress={() => {
                setVerifying(false);
                setOtp("");
                setNote(null);
              }}
            />
          </View>
        ) : null}
        {forgot || verifying ? null : (
          <>
            {ticket ? (
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                accessibilityLabel={copy.secondFactor}
                placeholder={copy.secondFactor}
                placeholderTextColor={palette.onSurfaceVariant}
                className="min-h-14 rounded-2xl border border-line bg-card px-5 text-base text-ink"
              />
            ) : null}
            <ChunkButton
              className="mt-2 w-full"
              label={pending ? "Abrindo" : ticket ? copy.finishLogin : creating ? "Criar conta" : "Entrar"}
              onPress={() => {
                if (email.trim().length === 0 || !email.includes("@") || password.length < 8) {
                  setError("Confira o e-mail e use uma senha com pelo menos 8 caracteres.");
                  return;
                }
                void submit();
              }}
              disabled={pending}
            />
            <ChunkButton
              className="w-full"
              label={creating ? "Já tenho conta" : "Ainda não tenho conta"}
              onPress={() => {
                setCreating((value) => !value);
                setError(null);
              }}
              tone="ghost"
            />
          </>
        )}
        {creating || forgot || verifying ? null : (
          <ChunkButton className="w-full" label={copy.forgot} tone="ghost" onPress={() => setForgot(true)} />
        )}
        </View>
        </Panel>
      </View>
    </AppFrame>
  );
}
