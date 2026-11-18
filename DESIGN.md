---
name: Prosa Gamified & Vibrant
description: Interface calorosa, tátil e gamificada — anti-tédio, com elenco histórico ilustrado, progressão viciante e elegância interativa
version: 3.0.0
platform: responsive (desktop-first + mobile-optimized)

colors:
  # Base & Surfaces (Quente e Acolhedor)
  background: "#FDFBF7"        # Baunilha aconchegante para leitura prolongada
  surface: "#FFFFFF"           # Branco puro para cards táteis
  surfaceRaised: "#F5F0E8"     # Fundo de poços e trilhas
  surfaceDark: "#18181B"       # Modo escuro grafite aveludado
  surfaceDarkCard: "#27272A"   # Cards no modo escuro

  # Brand & Energizers
  brandPrimary: "#0D9488"      # Teal/Petróleo vibrante e moderno
  brandPrimaryDark: "#0F766E"   # Borda 3D inferior do botão primário
  brandAccent: "#F59E0B"       # Âmbar / Ouro de sabedoria e streaks
  brandAccentDark: "#D97706"   # Borda 3D do botão âmbar
  brandCoral: "#FB7185"        # Coral alegre de energia e celebração
  brandViolet: "#8B5CF6"       # Roxo de maestria e mentes lendárias

  # Gamification & Status
  streakFire: "#FF5722"        # Laranja fogo intenso para sequência diária
  gemGems: "#06B6D4"           # Ciano diamante para gemas/pontos de foco
  comboFlame: "#EC4899"        # Magenta neon para combos do Duelo
  success: "#10B981"           # Esmeralda radiante de acerto e celebração
  successDark: "#059669"       # Borda 3D de sucesso
  error: "#EF4444"             # Vermelho vivo para revisão necessária
  errorDark: "#DC2626"         # Borda 3D de erro
  warning: "#F59E0B"           # Atenção amigável

  # Neutral Typography & Borders
  textMain: "#1E293B"          # Slate escuro de alto contraste e legibilidade
  textMuted: "#64748B"         # Cinza amigável para explicações e dicas
  textFaint: "#94A3B8"         # Metadados e atalhos de teclado
  borderDefault: "#E2E8F0"     # Borda sutil de apoio
  borderStrong: "#CBD5E1"      # Borda de botões e cartões interativos

typography:
  display:
    fontFamily: "Plus Jakarta Sans, Outfit, Inter, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "40px"
  title:
    fontFamily: "Plus Jakarta Sans, Outfit, Inter, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
  section:
    fontFamily: "Plus Jakarta Sans, Outfit, Inter, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
  body:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "22px"
  label:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "18px"
  reading:
    fontFamily: "Newsreader, Literata, Georgia, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "34px"
    maxWidth: "65ch"
  stats:
    fontFamily: "Plus Jakarta Sans, Outfit, monospace"
    fontSize: "16px"
    fontWeight: 800
    letterSpacing: "-0.5px"

rounded:
  control: "14px"              # Botões táteis arredondados
  card: "20px"                 # Cards de desafios e flashcards
  modal: "28px"                # Modais e bottom sheets
  pill: "9999px"               # Pílulas de status, streaks e XP

tactileElevation:
  button3D: "0 4px 0 var(--btn-border-color)"
  button3DPressed: "0 1px 0 var(--btn-border-color)"
  cardRest: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 4px 0 #E2E8F0"
  floatingCelebration: "0 20px 35px -10px rgba(13, 148, 136, 0.25)"

gamificationComponents:
  streakPill:
    icon: "🔥"
    bg: "#FFF7ED"
    border: "#FDBA74"
    text: "#C2410C"
  xpPill:
    icon: "⚡"
    bg: "#FEF3C7"
    border: "#FCD34D"
    text: "#B45309"
  gemsPill:
    icon: "💎"
    bg: "#ECFEFF"
    border: "#A5F3FC"
    text: "#0E7490"
---

# Prosa Design System (Gamificado, Vivo & Anti-Tédio)

## Identidade & Filosofia
O Prosa combina o rigor pedagógico do estudo sério de idiomas com a **fricção zero, dinamismo viciante e sensação constante de recompensa** que tornam apps modernos impossíveis de largar.

1. **Anti-Tédio Radical:** Cada tela possui movimento intencional, feedback háptico/visual imediato e nunca parece um formulário burocrático de escritório.
2. **O Elenco Histórico Como Companheiros Vivos:** Os 16 mestres intelectuais (Einstein, Marie Curie, Feynman, Da Vinci, Frida Kahlo, Machado de Assis) são ilustrados com traço pop carismático (avatares 3D/vetoriais expressivos). Eles celebram quando você acerta, ensinam com paciência quando você erra e acompanham cada passo da sessão diária.
3. **Física Tátil Satisfatória (Juicy UI):** Botões com relevo tátil 3D que realmente afundam ao pressionar, barras de progresso elásticas e com brilho interno, flashcards com virada 3D fluida e cartas de desconstrução gramatical colecionáveis.
4. **Metodologia "Through-Language":** Aprenda a língua-alvo apoiado na sua língua nativa (ex: Inglês ou Japonês através do Português do Brasil).
