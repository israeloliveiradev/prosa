import { useEffect, useReducer, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Image, ScrollView, Platform } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Logo } from "@/components/shell/logo";
import { authFlowReducer, initialAuthFlowState } from "@/features/auth/model/auth-flow";
import { toUserMessage } from "@/api/errors";
import { useCopy } from "@/lib/i18n";
import { firstDayHref, syncFirstDay } from "@/lib/first-day";
import { setPro } from "@/lib/progress";
import { finishVerify, getSession, sendLoginCode, useSession } from "@/lib/session";
import { fetchMailInbox, resendAccountEmail } from "@/lib/api";
import { normalizeOtp } from "@/lib/otp";
import { tap } from "@/lib/haptics";

const EINSTEIN_LIBRARY_IMG = "/einstein-reading.jpg";

export function AccountScreen() {
  const copy = useCopy();
  const session = useSession();
  const params = useLocalSearchParams<{ email?: string }>();
  const [activeTab, setActiveTab] = useState<"email" | "otp">("email");

  const [state, dispatch] = useReducer(
    authFlowReducer,
    initialAuthFlowState({
      signedIn: Boolean(session),
      initialMode: "signIn",
      initialEmail: params.email ?? "",
    }),
  );

  const otpInputsRef = useRef<Array<TextInput | null>>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session]);

  useEffect(() => {
    void fetchMailInbox().then((url) => {
      if (url) {
        dispatch({ type: "SET_INBOX_URL", url });
      }
    });
  }, []);

  useEffect(() => {
    if (state.resendCooldown <= 0) return;
    const interval = setInterval(() => {
      dispatch({ type: "TICK_COOLDOWN" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.resendCooldown]);

  const handleSendCode = async () => {
    const cleanEmail = state.email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      dispatch({
        type: "SET_ERROR",
        error: "Digite um endereço de e-mail válido.",
      });
      return;
    }

    void tap("medium");
    dispatch({ type: "SET_PENDING", pending: true });

    try {
      await sendLoginCode(cleanEmail);
      dispatch({ type: "REQUIRE_VERIFY", email: cleanEmail });
      setActiveTab("otp");
    } catch (caught) {
      dispatch({ type: "SET_ERROR", error: toUserMessage(caught, copy as any) });
    } finally {
      dispatch({ type: "SET_PENDING", pending: false });
    }
  };

  const handleVerifyCode = async () => {
    const code = normalizeOtp(otpDigits.join(""));
    if (code.length !== 6) {
      dispatch({ type: "SET_ERROR", error: "Digite os 6 dígitos do código recebido." });
      return;
    }

    void tap("medium");
    dispatch({ type: "SET_PENDING", pending: true });

    try {
      const user = await finishVerify(state.email, code);
      setPro(user.plan === "pro");
      const opened = getSession();
      if (opened) {
        await syncFirstDay(opened.token, opened.user);
        router.replace(firstDayHref(opened.user.id) as Href);
      } else {
        router.replace("/");
      }
    } catch (caught) {
      dispatch({ type: "SET_ERROR", error: toUserMessage(caught, copy as any) });
    } finally {
      dispatch({ type: "SET_PENDING", pending: false });
    }
  };

  const handleResend = async () => {
    if (!state.email.includes("@")) return;
    void tap("light");
    dispatch({ type: "SET_PENDING", pending: true });

    try {
      await resendAccountEmail(state.email);
      dispatch({ type: "TRIGGER_RESEND_COOLDOWN" });
    } catch (caught) {
      dispatch({ type: "SET_ERROR", error: toUserMessage(caught, copy as any) });
    } finally {
      dispatch({ type: "SET_PENDING", pending: false });
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const val = text.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View className="flex-1 bg-[#FDFBF7]">
      {/* Top Header & Brand Identity */}
      <View className="w-full border-b-2 border-[#E2E8F0] bg-white/90 z-30">
        <View className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex-row items-center justify-between">
          {/* Esquerda: Monograma Oficial Prosa */}
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push("/")} className="cursor-pointer">
              <Logo />
            </Pressable>
            <View className="hidden sm:flex flex-row items-center gap-2">
              <View className="px-2.5 py-0.5 rounded-full bg-[#F5F0E8] border border-[#CBD5E1]">
                <Text className="text-[11px] font-bold text-[#64748B]">
                  Acesso Sem Senha • Magic Link & OTP
                </Text>
              </View>
            </View>
          </View>

          {/* Direita: Mentores Ativos & Idioma */}
          <View className="flex-row items-center gap-3">
            <View className="hidden lg:flex flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-white border-2 border-[#E2E8F0] shadow-[0_2px_0_#CBD5E1]">
              <View className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <Text className="text-xs font-bold text-[#111C2D]">16 Mentores Históricos Ativos</Text>
            </View>
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#E2E8F0] shadow-[0_2px_0_#CBD5E1]">
              <Text className="text-xs font-bold text-[#111C2D]">Português (Brasil) 🇧🇷</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="w-full"
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ maxWidth: 1200, width: "100%", marginHorizontal: "auto", paddingHorizontal: 24, paddingVertical: 36 }}>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 32,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {/* Coluna Esquerda: Albert Einstein Polímata (5 Cols) */}
            <View
              style={{
                flex: 5,
                minWidth: 340,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Balão de Fala do Einstein */}
              <View
                style={{
                  position: "relative",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 22,
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                  boxShadow: "0 4px 0 #E2E8F0",
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>🧠</Text>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#111C2D" }}>Albert Einstein</Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 9999,
                      backgroundColor: "#F5F0E8",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#855300" }}>
                      Mentor Polímata • Nv 10
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: "#111C2D",
                    fontStyle: "italic",
                    lineHeight: 24,
                  }}
                >
                  “Sem senhas para esquecer! O tempo é relativo, mas a frustração com senhas perdidas é absoluta. Digite seu e-mail e enviaremos seu código de acesso instantâneo.”
                </Text>
              </View>

              {/* Cartão Ilustrado da Biblioteca de Einstein */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  padding: 16,
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                  boxShadow: "0 4px 0 #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <View
                  style={{
                    position: "relative",
                    borderRadius: 18,
                    overflow: "hidden",
                    aspectRatio: 4 / 3,
                    backgroundColor: "#F5F0E8",
                    borderWidth: 2,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Image
                    source={{ uri: EINSTEIN_LIBRARY_IMG }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 9999,
                      borderWidth: 2,
                      borderColor: "#E2E8F0",
                      boxShadow: "0 2px 0 #CBD5E1",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🔒</Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#00685F" }}>
                      Segurança Criptográfica & Zero Senhas
                    </Text>
                  </View>
                </View>

                {/* 3 Micro-Vantagens */}
                <View style={{ display: "flex", flexDirection: "row", gap: 8, paddingTop: 4 }}>
                  <View
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: "#F5F0E8",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>⚡</Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#111C2D" }}>Acesso em 5s</Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: "#F5F0E8",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🔒</Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#111C2D" }}>E2E Cripto</Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: "#F5F0E8",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🧠</Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#111C2D" }}>FSRS na Nuvem</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Coluna Direita: Hub Interativo Sem Senha (7 Cols) */}
            <View
              style={{
                flex: 7,
                minWidth: 380,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Seletor de Etapas 1 e 2 */}
              <View
                style={{
                  backgroundColor: "#F5F0E8",
                  padding: 6,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Pressable
                  onPress={() => setActiveTab("email")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: activeTab === "email" ? "#FFFFFF" : "transparent",
                    borderWidth: activeTab === "email" ? 2 : 0,
                    borderColor: "#E2E8F0",
                    boxShadow: activeTab === "email" ? "0 3px 0 #CBD5E1" : "none",
                    cursor: "pointer",
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: activeTab === "email" ? "#00685F" : "#CBD5E1",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFFFFF" }}>1</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: activeTab === "email" ? "#00685F" : "#64748B",
                    }}
                  >
                    1. Digitar E-mail
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab("otp")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: activeTab === "otp" ? "#FFFFFF" : "transparent",
                    borderWidth: activeTab === "otp" ? 2 : 0,
                    borderColor: "#E2E8F0",
                    boxShadow: activeTab === "otp" ? "0 3px 0 #CBD5E1" : "none",
                    cursor: "pointer",
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: activeTab === "otp" ? "#10B981" : "#CBD5E1",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFFFFF" }}>2</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: activeTab === "otp" ? "#10B981" : "#64748B",
                    }}
                  >
                    2. Código 6 Dígitos
                  </Text>
                </Pressable>
              </View>

              {/* Superfície Principal do Card */}
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  padding: 28,
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                  boxShadow: "0 6px 0 #E2E8F0",
                }}
              >
                {/* Erro global */}
                {state.error ? (
                  <View className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200">
                    <Text className="text-xs font-bold text-red-600">{state.error}</Text>
                  </View>
                ) : null}

                {activeTab === "email" ? (
                  /* ETAPA 1: SOLICITAR CÓDIGO */
                  <View className="flex-col gap-5">
                    <View>
                      <View className="inline-flex flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4F1] border border-[#00685F]/30 self-start mb-2">
                        <Text className="text-xs">🔑</Text>
                        <Text className="text-[11px] font-extrabold text-[#00685F] uppercase">
                          Fluxo 100% Sem Senhas
                        </Text>
                      </View>
                      <Text className="text-2xl sm:text-3xl font-extrabold text-[#111C2D] tracking-tight">
                        Entrar sem senha no Prosa
                      </Text>
                      <Text className="text-sm text-[#64748B] mt-1">
                        Digite seu e-mail corporativo ou pessoal para receber uma chave de acesso única.
                      </Text>
                    </View>

                    {/* Campo de E-mail Único (Fluxo Sem Senha Puro) */}
                    <View style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          color: "#111C2D",
                        }}
                      >
                        Seu Endereço de E-mail
                      </Text>
                      <View
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          backgroundColor: "#FFFFFF",
                          borderWidth: 2,
                          borderColor: "#CBD5E1",
                          borderRadius: 16,
                          boxShadow: "inset 0 2px 0 #E2E8F0",
                        }}
                      >
                        <Text style={{ fontSize: 18, marginRight: 12 }}>✉️</Text>
                        <TextInput
                          value={state.email}
                          onChangeText={(text) => dispatch({ type: "SET_FIELD", field: "email", value: text })}
                          placeholder="seu.email@exemplo.com"
                          placeholderTextColor="#94A3B8"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={{
                            flex: 1,
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#111C2D",
                            outlineStyle: "none" as any,
                          }}
                        />
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: "#64748B", marginTop: -2 }}>
                      🔒 Enviaremos um código de 6 dígitos para o seu e-mail. Sem senha necessária.
                    </Text>

                    {/* Botão Chunky 3D Teal */}
                    <Pressable
                      onPress={handleSendCode}
                      disabled={state.pending}
                      style={{
                        width: "100%",
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        borderRadius: 16,
                        backgroundColor: "#00685F",
                        boxShadow: "0 4px 0 #0F766E",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        cursor: "pointer",
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>
                        {state.pending ? "Enviando código..." : "Receber Código de Acesso ➔"}
                      </Text>
                    </Pressable>

                    {/* Modo Degustação */}
                    <Pressable
                      onPress={() => router.push("/")}
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        paddingTop: 8,
                        cursor: "pointer",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>
                        Entrar como Convidado (Modo Degustação) 🧭
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  /* ETAPA 2: DIGITAR CÓDIGO DE 6 DÍGITOS */
                  <View className="flex-col gap-5">
                    <View>
                      <View className="inline-flex flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-[#10B981]/30 self-start mb-2">
                        <Text className="text-xs">✉️</Text>
                        <Text className="text-[11px] font-extrabold text-[#059669] uppercase">
                          Código Enviado com Sucesso
                        </Text>
                      </View>
                      <Text className="text-2xl sm:text-3xl font-extrabold text-[#111C2D] tracking-tight">
                        Verifique sua caixa de entrada
                      </Text>
                      <View className="flex-row items-center gap-2 mt-2 p-2.5 px-3 rounded-xl bg-[#F5F0E8] border border-[#E2E8F0] self-start">
                        <Text className="text-xs text-[#64748B]">Enviado para:</Text>
                        <Text className="text-xs font-bold text-[#111C2D]">{state.email}</Text>
                        <Pressable onPress={() => setActiveTab("email")}>
                          <Text className="text-xs font-bold text-[#00685F] underline ml-1">
                            [Editar]
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* 6 Chunky Rounded Digit Inputs */}
                    <View className="flex-col gap-2">
                      <Text className="text-xs font-bold tracking-wider text-[#111C2D] uppercase">
                        Digite o Código de 6 Dígitos
                      </Text>
                      <View className="flex-row justify-between gap-2 sm:gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <TextInput
                            key={i}
                            ref={(el) => {
                              otpInputsRef.current[i] = el;
                            }}
                            value={otpDigits[i]}
                            onChangeText={(text) => handleOtpChange(text, i)}
                            onKeyPress={(e) => handleOtpKeyPress(e, i)}
                            maxLength={1}
                            keyboardType="number-pad"
                            className="flex-1 h-14 sm:h-16 text-center text-2xl font-black bg-white border-2 border-[#10B981] rounded-2xl shadow-[0_3px_0_#10B981] text-[#111C2D]"
                          />
                        ))}
                      </View>
                    </View>

                    {/* Timer Countdown Widget */}
                    <View className="flex-row items-center justify-between p-3.5 rounded-2xl bg-[#F5F0E8] border border-[#E2E8F0]">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base">⏱️</Text>
                        <Text className="text-xs font-bold text-[#111C2D]">
                          Reenviar código em{" "}
                          <Text className="text-[#FF5722] font-extrabold">
                            00:{state.resendCooldown < 10 ? `0${state.resendCooldown}` : state.resendCooldown}
                          </Text>
                        </Text>
                      </View>
                      <Pressable
                        onPress={handleResend}
                        disabled={state.resendCooldown > 0}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            state.resendCooldown > 0 ? "text-[#94A3B8]" : "text-[#00685F]"
                          }`}
                        >
                          Reenviar agora
                        </Text>
                      </Pressable>
                    </View>

                    {/* Botão Chunky 3D Emerald */}
                    <Pressable
                      onPress={handleVerifyCode}
                      disabled={state.pending}
                      className="w-full py-4 px-6 rounded-2xl bg-[#10B981] shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-[0_1px_0_#059669] flex-row items-center justify-center gap-2 cursor-pointer"
                    >
                      <Text className="text-white text-base font-extrabold">
                        {state.pending ? "Verificando..." : "Confirmar e Entrar no Prosa ➔"}
                      </Text>
                    </Pressable>

                    {/* Links de Apoio */}
                    <View className="flex-row items-center justify-center gap-3 pt-1">
                      <Text className="text-xs text-[#64748B]">Não recebeu?</Text>
                      <Text className="text-xs font-bold text-[#00685F]">Verificar pasta de spam</Text>
                      <Text className="text-xs text-[#CBD5E1]">•</Text>
                      <Text className="text-xs font-bold text-[#059669]">Reenviar via WhatsApp</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="w-full py-4 px-4 border-t-2 border-[#E2E8F0] bg-white/70">
        <View className="max-w-7xl mx-auto flex-col sm:flex-row items-center justify-between gap-2">
          <Text className="text-xs text-[#64748B]">
            Prosa Learning Systems © 2025 • Método polímata de transferência sintática direta
          </Text>
          <View className="flex-row items-center gap-4">
            <Text className="text-xs font-bold text-[#64748B]">Termos</Text>
            <Text className="text-xs text-[#CBD5E1]">•</Text>
            <Text className="text-xs font-bold text-[#64748B]">Privacidade Zero-Knowledge</Text>
            <Text className="text-xs text-[#CBD5E1]">•</Text>
            <Text className="text-xs font-bold text-[#64748B]">Suporte Acadêmico</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
