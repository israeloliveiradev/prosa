---
version: 1
slug: "mobile-src-app-public-account-tsx"
primary_target: "mobile/src/app/(public)/account.tsx"
related_targets:
  - "mobile/src/app/(public)/reset.tsx"
  - "mobile/src/features/auth/screens/account-screen.tsx"
  - "mobile/src/features/auth/screens/reset-screen.tsx"
---

# Surface Brief: Account (/account, /reset)

Scope: mobile/src/app/(public)/account.tsx
Mode: Operate

## Direction contract

### THESIS
A porta de entrada do Prosa. Responde diretamente e sem tropeço à pergunta: "Como eu entro sem me perder?". Elimina kickers decorativos, botões 3D com relevo infantil, fontes serifadas em comandos e formulários poluídos. O estudante encontra um formulário de alta densidade e foco absoluto, com transições macias e feedback tátil.

### OWN-WORLD
`PublicShell` centrado com fundo `palette.frame`. No desktop (>= 1024px), um bloco lateral à esquerda expõe as quatro mentes pedagógicas (Einstein, Curie, Feynman, Leonardo) em círculos de 64px sobre seus respectivos tons estáveis (`cast-*`), acompanhadas da frase sóbria: "Quatro mentes conduzem os seus vinte minutos.". A folha de autenticação tem 400px de largura máxima, cantos de 16px (`radius.sheet`), borda sutil de 1px (`palette.border`) e zero sombras artificiais em repouso.

### STORY
O usuário acessa para entrar ou criar conta. Se não tiver conta, alterna para criação em uma única transição fluida, escolhendo e-mail, senha com medidor de força e nível de partida via `Segmented`. Se já tem conta, digita e entra. Se 2FA ou verificação for requerida, o `OtpField` de 6 dígitos assume o palco com foco automático e contagem regressiva de 30 segundos para reenvio.

### FIRST VIEWPORT
Desktop (1280px): Centralizado na janela. À esquerda: coluna com a marca Prosa, título editorial, frase sobre o elenco e os 4 retratos em seus slots. À direita: cartão de 400px com h1 semântico ("Entrar", "Criar sua conta", "Confirme seu e-mail", "Segundo fator"), subtítulo em `palette.muted`, campos com acessibilidade completa, erros inline com `role="alert"` e botão primário quase preto de largura total. Mobile (375px): Cartão empilhado e centralizado preenchendo a tela com margem de 16px.

### FORM
framed-sheet, seed:60018bf9decc636b, tipografia IBM Plex Sans.

### FINISH
Validação com testes unitários da máquina de fluxo, 0 erros no tsc e expo lint, e specs Playwright cobrindo login, cadastro, 2FA, recuperação de senha e dupla submissão.
