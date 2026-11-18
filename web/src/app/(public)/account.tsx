import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "expo-router";
import { ProsaLogo } from "@/components/ProsaLogo";
import { Flag } from "@/components/shell/flag";
import { useProsa } from "@/context/prosa-context";
import { sendAccountOtp, confirmAccountEmail, registerAccount } from "@/api/auth";
import { rememberProfile } from "@/lib/session";

export default function AccountScreen() {
  const router = useRouter();
  const { resetProgress } = useProsa();
  const [screenMode, setScreenMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle OTP digit changes with auto-advance
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split("");
    const newOtp = [...otpCode];
    digits.forEach((d, i) => {
      if (i < 6) newOtp[i] = d;
    });
    setOtpCode(newOtp);
    const targetIdx = Math.min(digits.length, 5);
    document.getElementById(`otp-digit-${targetIdx}`)?.focus();
  };

  const handleSendOtp = async () => {
    if (!email) return;
    setIsSendingOtp(true);
    try {
      await sendAccountOtp(email);
    } catch (err) {
      console.warn("Backend sendAccountOtp notice:", err);
    } finally {
      setIsSendingOtp(false);
      setOtpSent(true);
      setResendCooldown(45);
      setTimeout(() => {
        document.getElementById("otp-digit-0")?.focus();
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenMode === "register") {
      resetProgress();
      try {
        const res = await registerAccount({
          email,
          password,
          native_lang: "pt",
          target_lang: "en",
          level: "A2",
        });
        if ("token" in res && res.token) {
          rememberProfile(res.user);
        } else {
          rememberProfile({ email, display_name: name || undefined });
        }
      } catch {
        rememberProfile({ email, display_name: name || undefined });
      }
      router.push("/placement");
      return;
    }

    if (authMode === "otp") {
      if (!otpSent) {
        await handleSendOtp();
        return;
      }
      const fullCode = otpCode.join("");
      if (fullCode.length === 6) {
        try {
          const result = await confirmAccountEmail(email, fullCode);
          if (result?.user) {
            rememberProfile(result.user);
          }
        } catch (err) {
          console.warn("Verify notice:", err);
          rememberProfile({ email });
        }
      }
      router.push("/");
      return;
    }
    // Password mode
    rememberProfile({ email });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      {/* Top Mini Header Navigation */}
      <header className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <ProsaLogo variant="full" href="/" />
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            ✨ Edição Polímata
          </span>
        </div>

        {/* Quick language switcher & status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-sm text-xs font-semibold text-stone-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>16 Mentores Históricos Ativos</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200/80 shadow-sm text-xs font-bold text-stone-700 transition"
          >
            <Flag code="br" size={15} />
            <span>PT-BR</span>
            <span className="material-symbols-outlined text-sm text-stone-400">expand_more</span>
          </button>
        </div>
      </header>

      {/* Main Showcase & Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 md:py-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Charismatic Illustrated Library Study Nook with Einstein (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left relative">
            {/* Speech Bubble from Einstein */}
            <div className="relative mb-5 max-w-md bg-white border-2 border-stone-200/90 rounded-3xl p-5 shadow-sm transform -rotate-1 transition hover:rotate-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold">
                  💡
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Albert Einstein • Mentor Polímata
                </span>
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  Nível 10 Afinidade
                </span>
              </div>
              <p className="font-serif italic text-base sm:text-lg text-stone-800 leading-snug">
                “Pronto para dominar um novo idioma hoje? O tempo é relativo, mas 20 minutos de imersão focada
                dobram suas sinapses!”
              </p>
              {/* Speech Bubble Tail */}
              <div className="absolute -bottom-3 left-12 w-5 h-5 bg-white border-b-2 border-r-2 border-stone-200/90 transform rotate-45" />
            </div>

            {/* The Warm Nook Scene: Einstein, Mug, Glowing Desk, Floating Books */}
            <div className="relative w-full max-w-lg h-[340px] sm:h-[400px] flex items-center justify-center">
              {/* Warm Glow Aura in Background */}
              <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-amber-200/50 via-teal-100/40 to-emerald-100/40 filter blur-3xl -z-10" />

              {/* Illustrated Bookshelves Background Backdrop */}
              <div className="absolute inset-x-4 bottom-6 top-8 rounded-3xl bg-amber-50/60 border border-amber-200/60 p-4 -z-10 overflow-hidden flex flex-col justify-end">
                <div className="flex items-end gap-1.5 opacity-30 pb-3 border-b-4 border-amber-300">
                  <div className="w-4 h-24 bg-amber-800 rounded-t" />
                  <div className="w-5 h-28 bg-teal-800 rounded-t" />
                  <div className="w-3 h-20 bg-rose-800 rounded-t" />
                  <div className="w-6 h-32 bg-indigo-900 rounded-t" />
                  <div className="w-4 h-22 bg-amber-700 rounded-t" />
                  <div className="w-5 h-26 bg-emerald-800 rounded-t" />
                  <div className="w-3 h-18 bg-amber-900 rounded-t" />
                  <div className="w-6 h-30 bg-teal-900 rounded-t" />
                  <div className="w-4 h-24 bg-rose-700 rounded-t" />
                  <div className="w-5 h-28 bg-amber-800 rounded-t" />
                  <div className="w-3 h-22 bg-slate-700 rounded-t" />
                  <div className="w-6 h-32 bg-amber-900 rounded-t" />
                </div>
                <div className="flex items-end gap-1.5 opacity-25 pt-2">
                  <div className="w-5 h-20 bg-indigo-900 rounded-t" />
                  <div className="w-4 h-26 bg-amber-700 rounded-t" />
                  <div className="w-6 h-28 bg-teal-800 rounded-t" />
                  <div className="w-3 h-16 bg-rose-800 rounded-t" />
                  <div className="w-5 h-24 bg-emerald-700 rounded-t" />
                  <div className="w-4 h-22 bg-amber-800 rounded-t" />
                  <div className="w-6 h-30 bg-slate-800 rounded-t" />
                  <div className="w-5 h-20 bg-teal-900 rounded-t" />
                </div>
              </div>

              {/* Central Character Vector Illustration: Albert Einstein */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <svg
                    className="w-48 h-48 sm:w-56 sm:h-56 filter drop-shadow-xl"
                    viewBox="0 0 200 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Hair */}
                    <path
                      d="M50 80C35 60 40 30 65 30C75 15 105 10 125 25C145 10 170 25 170 45C185 55 185 85 170 100C185 115 175 140 155 145C160 165 140 180 120 175C100 185 80 175 70 160C50 165 35 145 40 125C25 110 30 85 50 80Z"
                      fill="#F8FAFC"
                      stroke="#E2E8F0"
                      strokeWidth="3"
                    />
                    {/* Face Shape */}
                    <ellipse cx="105" cy="105" rx="42" ry="46" fill="#FDE68A" />
                    {/* Ears */}
                    <circle cx="62" cy="108" r="11" fill="#FCD34D" />
                    <circle cx="148" cy="108" r="11" fill="#FCD34D" />
                    {/* Eyebrows */}
                    <path d="M80 82C88 78 98 80 100 84" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
                    <path d="M112 84C114 80 124 78 132 82" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
                    {/* Eyes */}
                    <circle cx="89" cy="94" r="5" fill="#1E293B" />
                    <circle cx="87" cy="92" r="1.8" fill="#FFFFFF" />
                    <path d="M120 94C123 90 129 90 132 94" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
                    {/* Nose */}
                    <path d="M105 93V106C105 108 102 110 99 110" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                    {/* Cheeks */}
                    <circle cx="77" cy="107" r="7" fill="#FB7185" fillOpacity="0.4" />
                    <circle cx="133" cy="107" r="7" fill="#FB7185" fillOpacity="0.4" />
                    {/* Moustache */}
                    <path
                      d="M82 120C92 114 103 118 106 122C109 118 120 114 130 120C134 123 130 130 120 128C110 126 107 132 105 132C103 132 100 126 90 128C80 130 78 123 82 120Z"
                      fill="#FFFFFF"
                      stroke="#E2E8F0"
                      strokeWidth="2"
                    />
                    {/* Grin */}
                    <path d="M96 132C101 136 109 136 114 132" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Cardigan */}
                    <path d="M68 150C75 140 92 142 105 146C118 142 135 140 142 150L155 195H55L68 150Z" fill="#78350F" />
                    <path d="M105 146V195" stroke="#92400E" strokeWidth="3" />
                    <circle cx="105" cy="160" r="2.5" fill="#F59E0B" />
                    <circle cx="105" cy="175" r="2.5" fill="#F59E0B" />
                    <circle cx="105" cy="190" r="2.5" fill="#F59E0B" />
                  </svg>

                  {/* Physics Badge */}
                  <div className="absolute -top-1 -right-2 bg-white/95 backdrop-blur px-2.5 py-1 rounded-xl border border-amber-300 shadow-md text-xs font-mono font-bold text-amber-800">
                    E = mc² ✨
                  </div>
                </div>

                {/* Wooden Desk */}
                <div className="w-72 sm:w-80 -mt-6 h-12 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 rounded-2xl shadow-xl border-t-4 border-amber-700 flex items-center justify-between px-6 relative z-20">
                  {/* Steaming Mug */}
                  <div className="relative flex items-center">
                    <div className="w-7 h-7 rounded-b-xl bg-teal-600 border-2 border-teal-700 flex items-center justify-center text-[10px] text-white font-black relative">
                      P
                      <div className="absolute -right-1.5 top-1 w-2 h-3 border-2 border-teal-700 rounded-r-full" />
                    </div>
                  </div>
                  {/* Book & Pen */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-6 bg-amber-50 rounded shadow-sm border border-amber-200 flex overflow-hidden">
                      <div className="w-1/2 border-r border-amber-200 p-0.5" />
                      <div className="w-1/2 p-0.5" />
                    </div>
                    <div className="w-1 h-6 bg-amber-400 rounded-full transform rotate-45 shadow" />
                  </div>
                  {/* Lamp */}
                  <div className="w-6 h-8 flex flex-col items-center">
                    <div className="w-5 h-3 bg-amber-400 rounded-t-full shadow-lg" />
                    <div className="w-1 h-4 bg-amber-600" />
                    <div className="w-3 h-1 bg-amber-700 rounded" />
                  </div>
                </div>
              </div>

              {/* Floating Book 1 */}
              <div className="absolute top-12 left-2 sm:left-6 z-20">
                <div className="px-3 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-md border-b-2 border-teal-900 flex items-center gap-1.5">
                  <Flag code="de" size={15} />
                  <span>Wortschatz</span>
                </div>
              </div>

              {/* Floating Book 2 */}
              <div className="absolute top-8 right-4 sm:right-8 z-20">
                <div className="px-3 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md border-b-2 border-rose-800 flex items-center gap-1.5">
                  <Flag code="fr" size={15} />
                  <span>Grammaire</span>
                </div>
              </div>

              {/* Floating Book 3 */}
              <div className="absolute bottom-16 left-6 z-20">
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white font-black text-xs shadow-md border-b-2 border-amber-700 flex items-center gap-1.5">
                  <Flag code="ja" size={15} />
                  <span>日本語 • 記憶</span>
                </div>
              </div>
            </div>

            {/* Social Proof Gamified Ribbon */}
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-semibold text-stone-600">
              <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-sm">
                <span className="text-base">🔥</span>
                <span>Método FSRS v4.5 Otimizado</span>
              </div>
              <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-sm">
                <span className="text-base">🧠</span>
                <span>Aprenda através do Português</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Authentication Card (5 cols) */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-sm border border-stone-200/80 relative">
              {/* Card Badge Top Right */}
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md border border-amber-400">
                ⚡ Ritual Diário
              </div>

              {/* Header */}
              <div className="text-left mb-6">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm border-b-2 border-teal-800">
                    <span className="material-symbols-outlined text-base">
                      {screenMode === "register" ? "person_add" : "school"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                    {screenMode === "register" ? "Criar Conta Prosa" : "Entrar no Prosa"}
                  </h2>
                </div>
                <p className="text-xs font-medium text-stone-500">
                  {screenMode === "register"
                    ? "Inicie seu ritual diário de 20 minutos com mentores polímatas."
                    : "O ritual diário de 20 minutos para fluência real."}
                </p>
              </div>

              {screenMode === "register" ? (
                /* CADASTRO DE NOVO USUÁRIO */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="reg-name" className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Seu Nome Completo
                    </label>
                    <input
                      type="text"
                      id="reg-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold focus:outline-none focus:border-teal-600 focus:bg-white transition"
                      placeholder="Ex: Ada Lovelace"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Seu E-mail
                    </label>
                    <input
                      type="email"
                      id="reg-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold focus:outline-none focus:border-teal-600 focus:bg-white transition"
                      placeholder="voce@exemplo.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Crie uma Senha
                    </label>
                    <input
                      type="password"
                      id="reg-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold focus:outline-none focus:border-teal-600 focus:bg-white transition"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </div>

                  <motion.button
                    whileTap={{ y: 3 }}
                    type="submit"
                    style={{ backgroundColor: "#0D9488" }}
                    className="w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 tracking-wide uppercase mt-2 shadow-[0_4px_0_#0F766E] transition-colors cursor-pointer"
                  >
                    <span>Criar Minha Conta & Iniciar</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </motion.button>
                </form>
              ) : (
                <>
                  {/* 1-Tap Social Logins */}
                  <div className="space-y-3 mb-5">
                    <motion.button
                      whileTap={{ y: 2 }}
                      onClick={() => router.push("/")}
                      type="button"
                      className="w-full py-3 px-4 rounded-2xl bg-white border border-stone-200 text-stone-700 font-bold text-xs shadow-[0_3px_0_#CBD5E1] flex items-center justify-center gap-3 transition-colors hover:bg-stone-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continuar com Google</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ y: 2 }}
                      onClick={() => router.push("/")}
                      type="button"
                      className="w-full py-3 px-4 rounded-2xl bg-white border border-stone-200 text-stone-800 font-bold text-xs shadow-[0_3px_0_#CBD5E1] flex items-center justify-center gap-3 transition-colors hover:bg-stone-50"
                    >
                      <svg className="w-4 h-4 fill-current text-black" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-.99 1.71-.85 2.73 1 .08 2.02-.54 2.56-1.23z" />
                      </svg>
                      <span>Continuar com Apple</span>
                    </motion.button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="border-t border-stone-200 w-full" />
                    <span className="bg-white px-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      ou com seu e-mail
                    </span>
                  </div>

                  {/* Mode Switcher Tabs */}
                  <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200/80 mb-5">
                    <button
                      type="button"
                      onClick={() => setAuthMode("password")}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        authMode === "password"
                          ? "bg-white text-stone-900 shadow-sm border border-stone-200"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      <span>🔑 Com Senha</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("otp")}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        authMode === "otp"
                          ? "bg-white text-teal-800 shadow-sm border border-stone-200"
                          : "text-stone-500 hover:text-stone-700"
                      }`}
                    >
                      <span>⚡ Sem Senha (OTP)</span>
                    </button>
                  </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* E-mail (Common to both modes) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="email" className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                      E-mail de Acesso
                    </label>
                    {authMode === "otp" && otpSent && (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode(["", "", "", "", "", ""]);
                        }}
                        className="text-[11px] font-bold text-teal-700 hover:underline"
                      >
                        Alterar e-mail
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      disabled={authMode === "otp" && otpSent}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold focus:outline-none focus:border-teal-600 focus:bg-white transition ${
                        authMode === "otp" && otpSent ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      placeholder="voce@exemplo.com"
                      required
                    />
                    <div className="absolute right-3.5 top-3 text-emerald-500">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </div>
                  </div>
                </div>

                {/* MODE 1: PASSWORD */}
                {authMode === "password" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="password" className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                          Senha Secreta
                        </label>
                        <button
                          type="button"
                          onClick={() => setAuthMode("otp")}
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-800 transition"
                        >
                          Entrar sem senha?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold focus:outline-none focus:border-teal-600 focus:bg-white transition"
                          placeholder="••••••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-2 p-1 rounded-lg hover:bg-stone-200/60 transition"
                          title="Olhinhos do Albert: alternar visibilidade da senha"
                        >
                          <div className="flex items-center gap-0.5 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-full border border-amber-300">
                            <span className="text-xs">{showPassword ? "🙈" : "👀"}</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-stone-300"
                        />
                        <span className="text-xs font-medium text-stone-600">Lembrar neste navegador</span>
                      </label>
                      <span className="text-[11px] text-stone-400">
                        Atalho: <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border text-stone-600 text-[10px] font-mono">Enter</kbd>
                      </span>
                    </div>

                    <motion.button
                      whileTap={{ y: 3 }}
                      type="submit"
                      style={{ backgroundColor: "#0D9488" }}
                      className="w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 tracking-wide uppercase mt-2 shadow-[0_4px_0_#0F766E] transition-colors"
                    >
                      <span>Entrar no Prosa</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </motion.button>
                  </>
                )}

                {/* MODE 2: OTP (PASSWORDLESS) */}
                {authMode === "otp" && (
                  <div className="space-y-4 pt-1">
                    {!otpSent ? (
                      <>
                        <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/60 flex items-start gap-2.5">
                          <span className="text-base mt-0.5">⚡</span>
                          <p className="text-xs text-teal-900 leading-relaxed font-medium">
                            Sem senhas para esquecer! Enviaremos um código de 6 dígitos para o seu e-mail para acesso instantâneo.
                          </p>
                        </div>

                        <motion.button
                          whileTap={{ y: 3 }}
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                          style={{ backgroundColor: "#0D9488" }}
                          className="w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 tracking-wide uppercase shadow-[0_4px_0_#0F766E] transition-colors disabled:opacity-60"
                        >
                          {isSendingOtp ? (
                            <span>Enviando código...</span>
                          ) : (
                            <>
                              <span>Receber Código de 6 Dígitos</span>
                              <span className="material-symbols-outlined text-base">send</span>
                            </>
                          )}
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                              Digite o Código de 6 Dígitos
                            </span>
                            <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              Enviado agora
                            </span>
                          </div>

                          {/* 6 OTP Inputs */}
                          <div className="flex items-center justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                            {otpCode.map((digit, index) => (
                              <input
                                key={index}
                                id={`otp-digit-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                className="w-11 sm:w-12 h-14 text-center text-xl font-black rounded-xl bg-stone-50 border-2 border-stone-200 focus:border-teal-600 focus:bg-white text-stone-900 focus:outline-none transition shadow-[0_2px_0_#CBD5E1]"
                              />
                            ))}
                          </div>
                          <p className="text-[11px] text-stone-500 text-center mt-2">
                            Cole o código ou digite dígito a dígito
                          </p>
                        </div>

                        <motion.button
                          whileTap={{ y: 3 }}
                          type="submit"
                          style={{ backgroundColor: "#0D9488" }}
                          className="w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 tracking-wide uppercase shadow-[0_4px_0_#0F766E] transition-colors"
                        >
                          <span>Verificar e Entrar no Prosa</span>
                          <span className="material-symbols-outlined text-base">check</span>
                        </motion.button>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <button
                            type="button"
                            disabled={resendCooldown > 0}
                            onClick={handleSendOtp}
                            className="font-bold text-teal-700 hover:text-teal-800 disabled:text-stone-400 transition"
                          >
                            {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : "Reenviar código"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuthMode("password")}
                            className="font-semibold text-stone-500 hover:text-stone-700 transition"
                          >
                            Entrar com senha secreta
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </form>
              </>
              )}

              {/* Links */}
              <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col items-center gap-2 text-center">
                {screenMode === "login" ? (
                  <p className="text-xs font-medium text-stone-600">
                    Não tem uma conta ainda?{" "}
                    <button
                      type="button"
                      onClick={() => setScreenMode("register")}
                      className="font-extrabold text-teal-700 hover:underline transition cursor-pointer"
                    >
                      Crie grátis em 30 segundos
                    </button>
                  </p>
                ) : (
                  <p className="text-xs font-medium text-stone-600">
                    Já tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => setScreenMode("login")}
                      className="font-extrabold text-teal-700 hover:underline transition cursor-pointer"
                    >
                      Entrar na minha conta
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            Prosa Learning Systems © 2025
          </span>
          <span>•</span>
          <span className="hidden md:inline">Método polímata de transferência sintática direta</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium">Idioma de Apoio:</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-stone-200 shadow-sm text-xs font-bold text-stone-700 transition"
          >
            <span>Português (Brasil)</span>
            <Flag code="br" size={15} />
            <span className="material-symbols-outlined text-sm text-stone-400">expand_more</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
