# Redesign do Prosa: desktop primeiro

Data: 2026-10-08. Estado: proposta para revisão.

## 1. Intenção

O aplicativo Prosa (Expo SDK 57, Expo Router, React Native Web, NativeWind 4) ganha uma interface nova, pensada para o desktop primeiro. O mobile vem no fim, com os mesmos componentes.

O que o dono pediu:

- O desktop precisa funcionar muito bem. O mobile fica para a última etapa.
- Visual moderno e simples, com uma ação clara por tela e sem excesso de informação.
- O dinamismo e a ludicidade do Duolingo com a estrutura limpa do Babbel.
- Liberdade para recriar a aplicação inteira.

Decisões tomadas na conversa:

| Tema | Decisão |
| --- | --- |
| Base técnica | Manter Expo + React Native Web. Layout próprio para desktop. Lógica, `lib/`, `services/` e API não mudam. |
| Identidade | Editorial lúdico: terracota, papel creme, serifa nos títulos, botões 3D e cores de feedback vivas. As mentes funcionam como mascotes. |
| Trilha | Trilha de dias. Cada nó é uma sessão diária, agrupada por semana e nível CEFR. Não precisa de dados novos da API. |
| Recompensa | XP calculado no aparelho a partir do que já existe, mais uma meta diária. Sem moedas e sem loja. |

Critério de sucesso: no desktop (1280 px ou mais) o Prosa parece um produto pronto. Há um sistema visual único, cada tela tem uma ação principal evidente e a lição não tem distrações. Tudo passa no contraste WCAG AA e funciona só com o teclado.

Fora de escopo: mudar a API, o banco ou o modelo de conteúdo. Moedas, loja e ligas. Pastas nativas `ios/` e `android/`.

## 2. Diagnóstico do estado atual

1. Duas identidades. O tema oficial é terracota e creme ([tokens.ts](../../../mobile/src/design/tokens.ts)), mas a Home usa `emerald-*` fixo no código e ignora o tema escuro.
2. Tokens inexistentes. `bg-canvas` e `bg-cardHover` são usados e não existem no `tailwind.config.js`. Afetam `(tabs)/index.tsx`, `(onboarding)/quiz.tsx`, `home/fluency-meter-card.tsx` e `session/interleaving-container.tsx`.
3. Home com sete blocos empilhados e nenhuma ação principal.
4. Emojis no lugar de ícones e textos em caixa alta soltos.
5. O desktop é um celular esticado: uma barra no topo com cinco links e conteúdo limitado a `max-w-6xl`.
6. Não há componentes base compartilhados (botão, cartão, barra de progresso). Cada tela monta o seu `Pressable`.
7. Arquivos grandes misturam lógica e layout: `quiz.tsx`, `daily.tsx`, `settings.tsx` e `home/daily-news.tsx`, todos acima de 23 KB.

## 3. Design system

### 3.1 Cores

Todo componente usa token. Nenhuma cor fixa (hex ou `emerald-*`) entra em componente.

| Token | Claro | Escuro | Borda 3D (claro / escuro) | Uso |
| --- | --- | --- | --- | --- |
| `paper` | `#FBF6EF` | `#14110F` | — | Fundo do app |
| `card` | `#FFFFFF` | `#1E1916` | — | Superfícies |
| `sunken` | `#F3EADF` | `#2A231F` | — | Trilhos, inputs, bloqueados |
| `line` | `#E8DCCF` | `#3A312B` | — | Bordas |
| `ink` | `#1F1A17` | `#F5EDE6` | — | Texto principal |
| `muted` | `#5C534C` | `#C9BBAF` | — | Texto secundário |
| `primary` | `#C2410C` | `#F07A45` | `#9A3412` / `#B4541F` | Ação principal, nó de hoje |
| `onPrimary` | `#FFFFFF` | `#1C0A06` | — | Texto sobre `primary` |
| `primarySoft` | `#FCE3D3` | `#3A2218` | — | Item ativo, fundos de destaque |
| `success` | `#15803D` | `#4ADE80` | `#166534` / `#15803D` | Acerto, nó concluído |
| `successSoft` | `#DCFCE7` | `#12321F` | — | Rodapé de acerto |
| `danger` | `#DC2626` | `#F87171` | `#991B1B` / `#B91C1C` | Erro |
| `dangerSoft` | `#FEE2E2` | `#3B1414` | — | Rodapé de erro |
| `streak` | `#F59E0B` | `#FBBF24` | `#B45309` / `#B45309` | Ofensiva, alerta. Texto sempre `ink` claro (`#1F1A17`) |
| `xp` | `#2563EB` | `#60A5FA` | `#1E40AF` / `#1D4ED8` | XP, meta, dicas, seleção |
| `xpSoft` | `#DBEAFE` | `#172554` | — | Opção selecionada |
| `pro` | `#7C3AED` | `#A78BFA` | `#5B21B6` / `#6D28D9` | Prosa Pro, selos raros |

No tema escuro, os botões `success`, `danger`, `xp` e `pro` usam texto `#14110F`. No claro, usam texto branco.

Contraste de referência no claro: `ink`/`paper` cerca de 16:1, `muted`/`paper` cerca de 7:1, branco sobre `primary`, `success`, `xp` e `danger` de 4,5:1 ou mais. A Etapa 5 confere cada par com uma ferramenta de contraste. O par que falhar escurece até passar.

Compatibilidade na transição: os nomes antigos continuam como apelidos. `ember` → `primary`, `emberSoft` → `primarySoft`, `onEmber` → `onPrimary`, `moss` → `success`, `mossSoft` → `successSoft`, `roseInk` → `danger`, `roseSoft` → `dangerSoft`, `sand` → `sunken`, `sandInk` → `ink`. Os que hoje faltam também passam a existir: `canvas` → `sunken`, `cardHover` → `sunken`. Os apelidos saem na Etapa 5.

### 3.2 Tipografia

Newsreader nos títulos e no texto de leitura. Nunito em toda a interface, no lugar da Source Sans 3. As duas já estão nas dependências (`@expo-google-fonts/newsreader`, `@expo-google-fonts/nunito`).

| Token | Fonte | Tamanho / linha | Uso |
| --- | --- | --- | --- |
| `display` | Newsreader 600 | 48/56 (`clamp` 36–48) | Saudação, fecho da lição |
| `h1` | Newsreader 600 | 36/44 (`clamp` 28–36) | Título de página |
| `h2` | Nunito 800 | 24/32 | Seções e pergunta da lição |
| `h3` | Nunito 700 | 18/26 | Título de cartão |
| `reading` | Newsreader 400 | 20/32 | Frases da história |
| `body` | Nunito 500 | 16/24 | Texto geral |
| `label` | Nunito 700 | 14/20 | Botões, navegação, chips |
| `micro` | Nunito 700 | 12/16 | Badges e contadores; mínimo absoluto |

Texto em frase normal. A caixa alta fica restrita a `micro` com espaçamento de 0,06em.

### 3.3 Espaçamento, raios e movimento

- Espaçamento com base 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Raios: `sm` 8, `md` 12, `lg` 16, `xl` 20, `2xl` 24, `full`.
- Movimento: pressão 120 ms, transição 200 ms, entrada 320 ms, celebração 500 ms. Com `prefers-reduced-motion`, as durações caem para perto de zero, como o `global.css` já faz.

### 3.4 Breakpoints

| Faixa | Layout |
| --- | --- |
| 1280 px ou mais (alvo principal) | Barra lateral de 248 px, conteúdo central de até 680 px e coluna lateral de 340 px |
| 1024 a 1279 | Barra lateral só com ícones (80 px), conteúdo e coluna lateral |
| 768 a 1023 | Barra lateral só com ícones e conteúdo; a coluna lateral desce para o fim da página |
| abaixo de 768 (Etapa 6) | Barra inferior de 5 abas e conteúdo em largura total |

`hooks/use-breakpoint.ts` devolve `"mobile" | "tablet" | "laptop" | "desktop"` a partir de `useWindowDimensions`. Nenhuma tela compara largura diretamente.

### 3.5 Componentes base (`mobile/src/components/ui/`)

| Componente | Especificação |
| --- | --- |
| `Button` | Variantes `primary`, `success`, `danger`, `secondary`, `ghost`. Prop `disabled`. Tamanhos `md` (52) e `lg` (56). Raio 16 e borda inferior de 4 px na cor 3D. Pressionado: desce 4 px e a borda vai a 0. `loading` mostra um indicador e bloqueia o clique duplo, como o `ChunkButton`. Desabilitado: fundo `sunken`, texto `muted`, sem borda 3D. |
| `Card` | Raio 20, borda 2 px `line`, fundo `card`. `interactive` ganha borda 3D de 4 px `line` e hover de -2 px na web. `selected` troca a borda para `xp` e o fundo para `xpSoft`. |
| `ProgressBar` | Trilho `sunken`, altura 12 (`md`) ou 16 (`lg`). Preenchimento animado na largura com faixa de brilho interna. A variante `segmented` recebe `segments: { label, value, state }[]`. |
| `StatPill` | Ícone e número (ofensiva, XP, revisões). Tooltip com o rótulo completo. |
| `StatCard` | Ícone, número grande e rótulo, para o Perfil. |
| `TrailNode` | Círculo de 72 px. Estados `done` (`success`), `today` (`primary`, anel de progresso e pulso), `locked` (`sunken`), `special` (`streak`, para a reconstrução). |
| `Medal` | Selo redondo com borda 3D. Bloqueado em `sunken` com a dica no tooltip. |
| `Badge`, `Chip` | Contagem e etiqueta. `Chip` aceita `selected`. |
| `Tooltip` | Só na web, em hover e foco. No nativo, renderiza só o filho. |
| `Sheet` | Modal centralizado (máximo 520 px) a partir de `laptop`, folha inferior no mobile. Fecha com `Esc` e com toque fora. Prende o foco. |
| `TextField` | Rótulo visível, ajuda e erro abaixo, altura 52, borda 2 px que vira `xp` no foco. Substitui o `SoftInput` e mantém as props dele. |
| `Icon` | O [icon.tsx](../../../mobile/src/components/shell/icon.tsx) existente, com o conjunto SVG ampliado: trilha, raio, cérebro, jornal, usuário, chama, estrela, cadeado, microfone, alto-falante, check, x, mais, engrenagem, coroa. Nenhum emoji como ícone. |

Catálogo: a rota `/dev/ui` existe só com `__DEV__` e mostra todos os componentes em todos os estados, nos temas claro e escuro.

## 4. Estrutura da tela e navegação

### 4.1 Grupos de rota

Os grupos do Expo Router não mudam as URLs.

| Grupo | Layout | Rotas |
| --- | --- | --- |
| `(app)` | `AppShell`: barra lateral, conteúdo e coluna lateral | `/`, `/practice`, `/memory`, `/news`, `/profile` (nova), `/settings`, `/guide`, `/paywall`, `/score`, `/pairs`, `/life`, `/org`, `/dossier`, `/admin` |
| `(focus)` | `FocusShell`: tela cheia, sem navegação | `/daily`, `/duel`, `/persona`, `/prose`, `/placement`, `/exam`, `/start`, `/quiz` |
| `(public)` | `PublicShell`: página centralizada | `/account`, `/reset`, `/cert/[token]`, `/dossier/[token]` |

A guarda de login hoje dentro do `AppFrame` (`locked && !isPublicPath`) passa para os layouts `(app)` e `(focus)`. O aviso de API fora do ar (`pingApi`) vira uma faixa no topo do `AppShell` e do `FocusShell`.

### 4.2 Navegação principal

Cinco destinos: Aprender `/`, Praticar `/practice`, Memória `/memory`, Notícias `/news` e Perfil `/profile`.

O menu "Mais", no rodapé da barra lateral, reúne Configurações, Guia, Prosa Pro, Organização, Dossiê, Admin (só para `role === "admin"`) e Sair, com a confirmação que já existe.

Praticar dá acesso a Duelo, Cena, Prosa viva, Exame, Pares e Minha vida.

### 4.3 AppShell no desktop

- **Barra lateral fixa:** logo, cinco `NavItem`, cartão Prosa Pro (só na edição grátis), "Mais" e o avatar com o nome. O item ativo tem fundo `primarySoft`, texto `primary` e uma barra de 4 px à esquerda. Entre 1024 e 1279 px mostra só os ícones, com tooltip.
- **Sem barra no topo do app.** O conteúdo começa no topo.
- **Coluna lateral fixa**, de cima para baixo:
  1. Linha de `StatPill`: idioma ativo (abre o `LanguageSwitcher`), ofensiva e XP de hoje.
  2. Meta diária com `ProgressBar` (XP de hoje / meta).
  3. Revisões pendentes com o botão "Revisar agora" (`countDue`).
  4. Semana da ofensiva: sete pontos de segunda a domingo, a partir das datas de `progress.history`.
  5. Espaço da página, preenchido pela prop `aside` do `<Page>`.
- **Rolagem:** só a coluna central rola. Na web, as colunas laterais usam `position: sticky` num arquivo `.web.tsx`.
- **`<Page title subtitle aside>`:** cabeçalho com `h1` e subtítulo `muted`, e coluna central de até 680 px.

### 4.4 FocusShell

- **Barra do topo:** fechar (com confirmação se houver progresso), `ProgressBar` segmentada, relógio opcional, XP ganho e menu `⋯` opcional.
- **Conteúdo** centralizado em até 720 px.
- **Rodapé fixo** com ação secundária à esquerda e principal à direita. Estado de feedback: fundo `successSoft` ou `dangerSoft`, ícone, título ("Correto!" / "Resposta certa:") e botão "Continuar" na variante de mesma cor. Entra deslizando de baixo em 200 ms.

### 4.5 Teclado

| Contexto | Tecla | Ação |
| --- | --- | --- |
| Lição, duelo, onboarding | `1`–`4` | Escolher a opção N |
| Lição | `Enter` | Ação principal do rodapé |
| Lição | `Esc` | Abrir a confirmação de saída |
| Revisão SRS | `Espaço` | Virar a carta |
| Revisão SRS | `1`–`4` | Errei, Difícil, Bom, Fácil |
| Global | `Tab` | Foco visível: contorno de 2 px `primary` com afastamento de 3 px |

Os atalhos ficam em `hooks/use-hotkeys.ts` e só são registrados na web. Campos de texto em foco não disparam atalhos.

## 5. XP e meta diária

Arquivo `mobile/src/lib/xp.ts`. Chave local `prosa.xp.v1` no formato `{ log: Record<isoDate, number>, goal: 20 | 50 | 100 }`. A meta padrão é 50.

| Ação | XP | Limite |
| --- | --- | --- |
| Fase da sessão concluída (revisão, ouvir, leitura, fala, diário) | 10 cada | Uma vez por fase por dia |
| Carta revisada com qualidade 3 ou mais | 1 | 20 por dia |
| Fala com 90% ou mais | 5 | Uma vez por dia |
| Reconstrução concluída | 20 | Uma vez por reconstrução |
| Acerto no duelo | 1 | 30 por dia |

Para garantir os limites, `awardXp(reason, key)` guarda as chaves já premiadas do dia. A API expõe `useXp()` (`today`, `total`, `goal`, `streakWeek`), `awardXp`, `setXpGoal` e `resetXp`. `resetXp` é chamado por `clearLocalProgress`. A meta é escolhida em Configurações.

Há testes em `test/` para o cálculo, os limites, a troca de dia e a meta.

## 6. Telas

### 6.1 Aprender (`/`)

- Saudação em `display` e subtítulo "Idioma · Nível · Semana N".
- **Cartão "Sessão de hoje"**, a única ação principal da página:
  - Mente do dia (`Figure`), tema e as cinco fases como pontos.
  - "20 min · +50 XP" e o botão `primary lg` "Começar" ou "Continuar".
  - Link "Escolher outro tema". Na edição grátis ele leva ao `/paywall`, mantendo a regra atual de `start()`.
- **Trilha de dias:**
  - Feita a partir de `progress.history` e do dia de hoje, agrupada por semana e nível.
  - Os nós alternam o deslocamento horizontal em ±40 px. A semana atual fica aberta; as anteriores ficam recolhidas.
  - Um nó feito abre um `Sheet` com o resumo e o botão "Rever" (`/daily?date=`). O nó `special` aparece quando `reconstructionDue` é verdadeiro.
- **Estados:**
  - Primeiro dia: um nó "Comece aqui".
  - Sessão concluída: o cartão vira "Sessão feita · +N XP" e a ação principal passa a ser "Revisar N cartas", ou "Abrir o duelo" se não houver revisões.
  - Carregando: esqueletos no formato final.
- **Coluna lateral própria (`aside`):** elenco de hoje com as quatro mentes em miniatura e um link para Configurações.
- **Saem da Home:** o medidor 360H, o nivelamento, as competências e os atalhos de prática. Os três primeiros vão para o Perfil.

### 6.2 Lição (`/daily`)

- O `daily.tsx` é dividido:
  - `hooks/use-daily-session.ts`: consulta da lição, relógio, deck, marcas, fases e `markSessionComplete`. Mantém o comportamento atual.
  - `components/session/stage-frame.tsx`: mente da fase, título da fase e instrução de uma linha.
  - A tela monta o `FocusShell`, a barra segmentada por `sessionPhases` e o relógio `formatClock`.
- As etapas atuais recebem só o visual novo:

| Etapa | Centro | Rodapé |
| --- | --- | --- |
| Revisão | Carta grande que vira | Errei, Difícil, Bom, Fácil |
| Ouvir | Botão de áudio grande e opções em `Card interactive` | Verificar, depois feedback |
| Leitura | Frase em `reading`, tradução em `muted`, navegação entre frases, botão de ouvir. Toque na palavra abre o `WordSheet`; dois toques abrem o `GrammarSheet` | Continuar |
| Fala | Microfone circular de 96 px com onda; resultado em radar de cadência | Gravar, depois Continuar |
| Diário | Área de texto ampla e contador de palavras | Enviar |
| Reconstrução | Igual ao diário, com ditado | Enviar |
| Fecho | Celebração: XP ganho com contagem, ofensiva e cartas novas | "Voltar para a trilha" e "Abrir o duelo" |

- `HandsFreePlayer` e a escolha de voz ficam no menu `⋯` da barra.
- O XP é concedido ao fim de cada fase e de cada revisão, conforme a seção 5.

### 6.3 Perfil (`/profile`)

- Cabeçalho: avatar com a inicial, nome, par de idiomas, data de entrada e o botão "Editar", que leva a Configurações.
- Quatro `StatCard`: ofensiva, XP total, cartas dominadas e melhor fala (`speakingBest`).
- Fluência 360H (`FluencyMeterCard` redesenhado) e as quatro competências (`CompetenceLine`).
- Selos: `Medal` para cada item de `BADGES`.
- Histórico: as últimas 10 sessões em lista compacta. Na edição grátis aparece um item, como hoje.
- Coluna lateral: resumo do Prosa Score com link para `/score`, e o `PlacementCard` ("Refazer teste").

### 6.4 Demais telas, no nível de resumo

Cada uma ganha detalhamento no plano de implementação, sempre com os componentes da seção 3.5.

- **Praticar:** grade de duas colunas. Duelo e Cena ocupam cartões grandes com uma mente; Prosa viva, Exame, Pares e Minha vida vêm em cartões menores. Cada cartão tem uma linha de descrição e um botão.
- **Memória:** abas Revisar, Deck e Mapa. Revisar abre a revisão no `FocusShell`. O Mapa usa a coluna central.
- **Notícias:** até três cartões de história com título em Newsreader, nível e tempo. Ao abrir, a leitura vai para o `FocusShell`.
- **Entrada (`/account`, `/reset`):** cartão de 440 px centralizado. A partir de `laptop`, uma faixa lateral com uma mente e a promessa do produto.
- **Onboarding (`/start`, `/quiz`):** `FocusShell`, uma pergunta por tela, cartões de opção grandes e atalhos `1`–`4`.
- **Secundárias:** Configurações, Guia, Pro, Score, Pares, Vida, Organização, Dossiê, Admin e Certificado usam `<Page>`, `Card`, `Button` e `TextField`, sem layout próprio.

## 7. Plano em etapas

Ao fim de cada etapa: `npx tsc --noEmit` e `npx expo lint` passam, `npm test` na raiz passa, e há conferência no navegador em 1440, 1280 e 1024 px nos temas claro e escuro.

1. **Fundação:** paleta e apelidos, CSS global e fontes, Tailwind, `useBreakpoint`, `lib/xp.ts` com testes.
2. **Componentes base:** a seção 3.5 e o catálogo `/dev/ui`.
3. **Estrutura da tela:** `AppShell`, `FocusShell`, `PublicShell`, grupos de rota, menu "Mais" e a guarda de login nos layouts.
4. **Telas**, nesta ordem: Aprender, Lição, Perfil, Memória, Praticar com Duelo e Cena, Notícias, Entrada e Onboarding, Secundárias.
5. **Acabamento do desktop:** microinterações, auditoria de contraste e teclado, estados vazio, carregando e erro, remoção do `AppFrame`, dos apelidos e dos componentes antigos.
6. **Mobile:** barra inferior, faixa do topo, áreas seguras, alvos de toque de 44 px ou mais, testes em 375 e 768 px e num aparelho real.

## 8. Riscos

| Risco | Mitigação |
| --- | --- |
| Mover rotas para grupos quebrar links ou redirecionamentos | URLs iguais. Antes de mover, listar todos os `router.push`, `router.replace`, `href` e `Redirect`. |
| `sticky` e `hover` não existirem no nativo | Arquivos `.web.tsx`, como `app-tabs.web.tsx` já faz. |
| O estado acoplado do `daily.tsx` | Extrair o hook sem mudar o comportamento e percorrer uma sessão completa antes e depois. |
| Telas antigas destoarem durante a transição | Apelidos de token da seção 3.1. |
| Contraste do tema escuro | Conferência par a par na Etapa 5. |
