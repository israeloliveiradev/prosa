---
version: 1
slug: "mobile-src-app-focus-placement-tsx"
primary_target: "mobile/src/app/(focus)/placement.tsx"
related_targets:
  - "mobile/src/features/placement/screens/placement-screen.tsx"
  - "mobile/src/features/placement/model/placement-flow.ts"
  - "mobile/src/features/placement/components/question.tsx"
  - "mobile/src/features/placement/components/result.tsx"
  - "mobile/src/features/placement/components/skill-bars.tsx"
---

# Surface Brief: Placement Test (/placement)

Scope: mobile/src/app/(focus)/placement.tsx & features/placement/*
Mode: Operate

## Direction contract

### THESIS
Avaliação de proficiência sem ansiedade nem armadilhas. Responde com clareza à pergunta: "Em que nível do idioma eu me encontro agora?". Apresenta questões concisas de múltipla escolha e áudio opcional, calcula o nível CEFR (A1 a C2) em tempo real através de adaptação dinâmica e expõe o resultado decomposto em 4 habilidades (Vocabulário, Gramática, Leitura, Escuta) com barras proporcionais e explicações encorajadoras.

### OWN-WORLD
`FocusShell` imersivo focado na tarefa. No topo, barra de progresso das questões (`Progress` ou régua sutil de 12 a 15 itens). No corpo, a pergunta em tipografia Literata (`type.reading`), opções de resposta em cartões planos com seleção nítida (`palette.active` e borda `palette.accent`), e botões de áudio para ouvir a pronúncia neural quando aplicável.

### STORY
O usuário inicia o nivelamento (seja embutido no onboarding ou acessado independentemente). Cada resposta avança automaticamente após feedback sutil ou via botão de confirmação. Ao concluir, a tela de resultado revela o nível CEFR obtido (ex: "B1 - Independente"), exibe o gráfico de habilidades com `SkillBars`, detalha o diagnóstico "can-do" e oferece botão direto para salvar e entrar no plano de estudo personalizado.

### FIRST VIEWPORT
Área de questão centralizada de 600px de largura, espaçamento generoso, opções táteis com altura mínima de 52px e foco por teclado (1-4, Enter). Sem distrações visuais, kickers ou elementos desnecessários.

### FORM
framed-sheet, seed:60018bf9decc636b, tipografia Literata para texto de leitura e IBM Plex Sans para controles.

### FINISH
Validação com testes unitários em `placement-flow.test.ts`, 0 erros no tsc e expo lint, e specs Playwright cobrindo início, resposta, término e persistência do nível conquistado.
