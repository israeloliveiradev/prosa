---
version: 1
slug: "mobile-src-app-app-guide-tsx"
primary_target: "mobile/src/app/(app)/guide.tsx"
related_targets:
  - "mobile/src/features/guide/screens/guide-screen.tsx"
  - "mobile/src/features/guide/components/area-hint.tsx"
---

# Surface Brief: Guia do Estudante (/guide)

Scope: mobile/src/app/(app)/guide.tsx & features/guide/*
Mode: Read

## Direction contract

### THESIS
Documento editorial de leitura prazerosa e imersiva. Responde com profundidade e concisão à pergunta: "Como eu aproveito os vinte minutos?". Rejeita tutoriais invasivos com tooltips saltitantes ou modais forçados. Apresenta o método pedagógico das quatro mentes históricas, o fluxo das etapas diárias, o funcionamento da retenção com FSRS e as práticas do Prosa.

### OWN-WORLD
`AppShell` com folha centralizada em modo Read. Coluna de texto calibrada com largura ideal de leitura (máximo de 68 caracteres ou ~640px). Tipografia editorial combinada: Literata para passagens demonstrativas e IBM Plex Sans para cabeçalhos e corpo. Tons de fundo `palette.sheet` sem distrações, borda sutil `palette.border` e zero sombras em repouso.

### STORY
O estudante abre o Guia quando deseja compreender a fundo a proposta do método ou revisar as dicas de uso. Navega confortavelmente por seções estruturadas (O ritmo do dia, As mentes pedagógicas, Memória & SRS, Notícias, Prática e Planos). No desktop (>= 1280px), um índice lateral sutil permite saltar diretamente para cada seção. No final, uma ação discreta "Rever as dicas" redefine os atalhos de primeira visita do app.

### FIRST VIEWPORT
Desktop: Título h1 "Como usar o Prosa" com subtítulo amigável, índice de leitura à direita e os primeiros blocos explicando o bloco de 20 minutos com a régua e o elenco de mentes. Mobile: Leitura contínua fluida com espaçamento vertical generoso e rolagem tátil suave.

### FORM
framed-sheet, modo Read, tipografia IBM Plex Sans e Literata.

### FINISH
Validação com testes unitários, 0 erros no tsc e expo lint, e specs Playwright cobrindo rolagem, índice de navegação e ação de redefinição de dicas de área.
