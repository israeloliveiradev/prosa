# Baseline Design Critique: Conta (`account.tsx`)

Method: dual-agent (Assessment A: Design Director Review · Assessment B: Automated Detector & Taste Inspect)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Estado de carregamento e submissão trava botão sem progresso mensurável |
| 2 | Match System / Real World | 3 | Formulário padrão de login/cadastro |
| 3 | User Control and Freedom | 2 | Monólito de 470 linhas alternando entre 4 fluxos sem rotas dedicadas |
| 4 | Consistency and Standards | 2 | Botão 3D desalinhado com caixas de texto planas |
| 5 | Error Prevention | 2 | Validação tardia apenas ao submeter formulário |
| 6 | Recognition Rather Than Recall | 2 | Ausência de feedback visível de requisitos de senha durante digitação |
| 7 | Flexibility and Efficiency | 2 | Falta suporte a preenchimento OTP fluido e autofill completo |
| 8 | Aesthetic and Minimalist Design | 1 | Fundo creme #fbf6ef, sem h1 semântico e ilustração gigante no desktop |
| 9 | Error Recovery | 2 | Bloco estático de erro vermelho |
| 10 | Help and Documentation | 2 | Ajuda sobre 2FA e recuperação pouco acessível |
| **Total** | | **20/40** | **Aceitável / Baixo** |

## Design Specificity Verdict

- **LLM Assessment**: Tela de conta tradicional com acabamento terracota e figura decorativa de Einstein ocupando 44% do espaço sem utilidade prática.
- **Deterministic Scan**: FAIL de `no-title` (ausência de h1 semântico), WARN de `palette-cream`, `contrast` abaixo de 4.5:1 no texto auxiliar.

## Priorities (Pre-redesign)
1. P1: Quebrar o monólito em componentes especializados e formulários isolados.
2. P1: Corrigir hierarquia semântica com h1 e contraste mínimo WCAG AA.
3. P2: Implementar OtpField acessível e foco automático no erro.
