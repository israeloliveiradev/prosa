---
target_identity: "file:C:\\WORKSPACE\\prosa\\mobile\\src\\app\\(session)\\daily.tsx"
target_fingerprint: "sha256:88ea84ba27cb3b2f3fa72f568c233d37485f6310162059c9f7c4784700091bed"
target_path: "C:\\WORKSPACE\\prosa\\mobile\\src\\app\\(session)\\daily.tsx"
timestamp: 2026-10-27T16-18-06Z
slug: mobile-src-app-session-daily-tsx
---
# Baseline Design Critique: Sessão Diária (`(session)/daily.tsx`)

Method: dual-agent (Assessment A: Design Director Review · Assessment B: Automated Detector & Taste Inspect)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | 9 useEffects orquestrando o relógio sem garantia de sincronia ou barra clara |
| 2 | Match System / Real World | 3 | Metáfora pedagógica de escuta, leitura e fala |
| 3 | User Control and Freedom | 1 | Sair da sessão causa risco de perda ou estado inconsistente |
| 4 | Consistency and Standards | 2 | Vidro em zinco frio (rgba) conflitante com a paleta terracota/creme |
| 5 | Error Prevention | 2 | Falhas de API de áudio interrompem a sessão sem fallback local suave |
| 6 | Recognition Rather Than Recall | 2 | Bloco de leitura longo sem marcadores visuais nítidos de progresso |
| 7 | Flexibility and Efficiency | 1 | Sem suporte a atalhos de teclado (espaço para áudio, 1-4 para notas) |
| 8 | Aesthetic and Minimalist Design | 1 | Botões 3D com borda grossa, cores de gamificação conflitantes |
| 9 | Error Recovery | 2 | Dificuldade de repetir áudio com facilidade ou corrigir gravação |
| 10 | Help and Documentation | 2 | Regras de repetição espaçada ocultas para o estudante |
| **Total** | | **18/40** | **Ruim** |

## Design Specificity Verdict

- **LLM Assessment**: A sessão de 20 minutos é o coração do Prosa, mas hoje sofre com peso de 671 linhas num único arquivo e ruído visual que desvia a atenção da leitura e da pronúncia.
- **Deterministic Scan**: Uso de micro-labels em caixa alta, classes de sombra dura e mono fora de código.

## Priorities (Pre-redesign)
1. P1: Extrair máquina de estados pura (`session-machine.ts`) testada unitariamente.
2. P1: Desenhar régua de 20 minutos (`SessionRuler`) e fecho autoral memorável.
3. P2: Implementar folhas de vocabulário e gramática sobre primitivos acessíveis.
