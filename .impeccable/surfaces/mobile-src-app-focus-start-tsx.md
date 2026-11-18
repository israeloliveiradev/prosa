---
version: 1
slug: "mobile-src-app-focus-start-tsx"
primary_target: "mobile/src/app/(focus)/start.tsx"
related_targets:
  - "mobile/src/app/(focus)/quiz.tsx"
  - "mobile/src/features/onboarding/screens/start-screen.tsx"
  - "mobile/src/features/onboarding/screens/quiz-screen.tsx"
  - "mobile/src/features/onboarding/model/journey-flow.ts"
---

# Surface Brief: Start & Onboarding (/start, /quiz)

Scope: mobile/src/app/(focus)/start.tsx & mobile/src/app/(focus)/quiz.tsx
Mode: Operate

## Direction contract

### THESIS
A ambientação inicial do estudante no Prosa. Responde diretamente e sem atrito à pergunta: "O que vou estudar e por quê?". Substitui contadores mecânicos ("01 / 05") pelo componente semântico `Stepper`, elimina kickers decorativos em caixa alta, botões 3D com relevo e textos com jargões. O usuário define o par de idiomas (com validação anti-reflexiva onde target != through), seleciona seus temas de interesse com chips acessíveis e avança com fluidez até o teste de nivelamento ou a primeira prosa.

### OWN-WORLD
`FocusShell` imersivo com barra superior de 56px (`palette.sheet`), `Stepper` integrado no topo indicando progresso sem ansiedade, área de trabalho centralizada de até 640px de largura. Fundo `palette.frame` no desktop e `palette.sheet` na folha ativa. Zero sombras em repouso, cantos suaves `radius.sheet` (16px) e feedback tátil sutil em cada seleção.

### STORY
Uma pessoa recém-cadastrada acessa `/start`. No passo 1 (boas-vindas), compreende a proposta editorial dos 20 minutos diários guiados pelas mentes. No passo 2 (par de idiomas), escolhe o idioma que deseja estudar e o idioma de apoio através de chips com bandeiras (`Flag`). No passo 3 (interesses), seleciona seus temas favoritos (notícias, cultura, ciência) e opcionalmente uma meta pessoal. No passo 4 (nivelamento), realiza o teste adaptativo sem pressão. No passo 5 (pronto), recebe seu nível inicial estimado com um botão convidativo: "Começar a primeira prosa".

### FIRST VIEWPORT
Desktop e Mobile: Barra superior limpa com botão de voltar/fechar à esquerda e `Stepper` centrado. O cartão de conteúdo centralizado apresenta um título `variant="title"` ("Qual idioma você quer dominar?", "Seus interesses", etc.), subtítulo em `palette.muted`, grade de seleção com foco visível e botão de avanço `Button` primário de largura total no mobile ou alinhado à direita no desktop.

### FORM
framed-sheet, seed:60018bf9decc636b, tipografia IBM Plex Sans.

### FINISH
Validação com testes unitários em `journey-flow.test.ts`, 0 erros no tsc e expo lint, e specs Playwright cobrindo avanço de passos, seleção de par e interesses e conclusão com transição para `/daily`.
