# Baseline Design Critique: Home (`(tabs)/index.tsx`)

Method: dual-agent (Assessment A: Design Director Review · Assessment B: Automated Detector & Taste Inspect)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Trilha e ofensiva não comunicam claramente o status de avanço do dia atual |
| 2 | Match System / Real World | 2 | Metáforas sobrecarregadas de gamificação e kickers laranjas artificiais |
| 3 | User Control and Freedom | 2 | Navegação rígida; ausência de controles diretos de pausa e retorno |
| 4 | Consistency and Standards | 2 | Conflito tipográfico entre Nunito arredondada e Newsreader display |
| 5 | Error Prevention | 3 | Estados vazios presentes, mas sem ações de recuperação rápida |
| 6 | Recognition Rather Than Recall | 2 | Carga cognitiva excessiva de cards e métricas sem hierarquia |
| 7 | Flexibility and Efficiency | 1 | Sem atalhos de teclado ou densidade ajustável para estudantes frequentes |
| 8 | Aesthetic and Minimalist Design | 1 | Paleta terracota/creme saturada, botões 3D deslocados e sombras duras |
| 9 | Error Recovery | 2 | Erros de sincronização exibidos de forma genérica |
| 10 | Help and Documentation | 2 | Ausência de dicas contextuais no primeiro uso |
| **Total** | | **19/40** | **Ruim** |

## Design Specificity Verdict

- **LLM Assessment**: A tela inicial parece um modelo genérico misturando Duolingo com elementos de blog literário antigo. A estrutura não transmite a calma nem o foco da sessão de 20 minutos.
- **Deterministic Scan**: Presença de kickers obrigatórios, `border-l-4` na barra lateral (`side-tab`) e micro-labels em caixa alta espaçada.

## Priorities (Pre-redesign)
1. P1: Substituir estética terracota e botões 3D por superfície neutra e régua de assinatura de 20 minutos.
2. P1: Eliminar kickers e estabelecer hierarquia h1 legítima (24-28px).
3. P2: Unificar tipografia em IBM Plex Sans e Literata.
