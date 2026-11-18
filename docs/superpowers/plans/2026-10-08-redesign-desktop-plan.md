# Plano de implementação: redesign desktop

Spec: [2026-10-08-redesign-desktop-design.md](../specs/2026-10-08-redesign-desktop-design.md).

As etapas 1 a 3 estão detalhadas tarefa por tarefa. As etapas 4 a 6 estão no nível de tarefa e arquivo. Cada tela da etapa 4 ganha um subplano curto neste mesmo arquivo antes de começar, porque depende do que as etapas 1 a 3 entregarem.

## Verificação padrão (VP)

Rodar ao fim de cada tarefa marcada com **VP**:

```bash
# em mobile/
npx tsc --noEmit
npx expo lint
# na raiz
npm test
```

Ao fim de cada etapa, conferir também no navegador (`npx expo start --web --port 8081`) em 1440, 1280 e 1024 px, nos temas claro e escuro. Os prints da conferência vão para o walkthrough.

Commits: um por tarefa, com mensagem `redesign(etapa.tarefa): ...`.

---

## Etapa 1: fundação

### 1.1 Paleta nova em `tokens.ts`

Arquivo: `mobile/src/design/tokens.ts`.

- Trocar o tipo `Palette` pelos papéis da spec (seção 3.1): `paper`, `card`, `sunken`, `line`, `ink`, `muted`, `primary`, `primaryEdge`, `onPrimary`, `primarySoft`, `success`, `successEdge`, `onSuccess`, `successSoft`, `danger`, `dangerEdge`, `onDanger`, `dangerSoft`, `streak`, `streakEdge`, `onStreak`, `xp`, `xpEdge`, `onXp`, `xpSoft`, `pro`, `proEdge`, `onPro`.
- Manter os campos antigos (`surface`, `surfaceBright`, `onSurface`, `onSurfaceVariant`, `primaryContainer`, `secondary`, `error`, `outline`...) como derivados dos novos. Mais de 40 arquivos leem `palette.onSurface` e outros nomes antigos, e precisam continuar funcionando.
- Exportar `lightPalette`, `darkPalette`, `motion = { press: 120, short: 200, medium: 320, celebrate: 500 }`. O `short` e o `medium` antigos ficam com os mesmos valores. `emphasized` vira apelido de `celebrate`.

**VP.**

### 1.2 Variáveis de tema

Arquivos: `mobile/src/theme/ThemeContext.tsx` e `mobile/src/global.css`.

- `themeVars(palette)` emite uma variável CSS por token novo (`--paper`, `--card`, `--sunken`, `--line`, `--ink`, `--muted`, `--primary`, `--primary-edge`, ...).
- Também emite as antigas como apelido: `--ember` = primary, `--ember-soft` = primarySoft, `--on-ember` = onPrimary, `--moss` = success, `--moss-soft` = successSoft, `--rose-ink` = danger, `--rose-soft` = dangerSoft, `--sand` = sunken, `--sand-ink` = ink.
- `global.css`: os mesmos valores em `:root.light` e `:root.dark`. Remover o bloco `prefers-color-scheme`, já que o tema só tem claro e escuro explícitos, como diz a doc 06.

**VP.**

### 1.3 Fontes

Arquivos: `mobile/src/app/_layout.tsx` e `mobile/src/global.css`.

- `useFonts` registra:
  - `Nunito` → `Nunito_500Medium`
  - `Nunito Bold` → `Nunito_700Bold`
  - `Nunito ExtraBold` → `Nunito_800ExtraBold`
  - `Newsreader` → `Newsreader_600SemiBold`
  - `Newsreader Text` → `Newsreader_400Regular`
- Mantém Source Sans 3 registrada até a Etapa 5, para não quebrar nenhuma referência.
- `global.css`:
  - O `@import` do Google Fonts passa a carregar Nunito 500, 700 e 800 e Newsreader 400 e 600.
  - `body` usa `"Nunito"` 16/24.
  - As regras `#root .font-label` passam a usar Nunito 700.
  - Os `clamp` de `display` e `h1` seguem a spec (36–48 e 28–36).

**VP**, mais conferência visual rápida de que o texto mudou de fonte na web.

### 1.4 Tokens no Tailwind

Arquivo: `mobile/tailwind.config.js`.

- `colors`: todos os tokens novos como `var(--x)`, e as bordas como `primaryEdge` etc.
- Apelidos antigos apontando para as variáveis novas: `ember`, `emberSoft`, `onEmber`, `moss`, `mossSoft`, `roseInk`, `roseSoft`, `sand`, `sandInk`. Os que faltavam passam a existir: `canvas` → `var(--sunken)`, `cardHover` → `var(--sunken)`.
- `fontFamily`:
  - `sans: ["Nunito"]`, `label: ["Nunito Bold"]`, `heavy: ["Nunito ExtraBold"]`
  - `display: ["Newsreader"]`, `displayItalic: ["Newsreader"]` (apelido), `reading: ["Newsreader Text"]`
- `fontSize`: `display` 48/56, `h1` 36/44, `h2` 24/32, `h3` 18/26, `reading` 20/32, `body` 16/24, `label` 14/20, `micro` 12/16. `headline` fica como apelido de `h1`.
- `borderRadius`: `sm` 8, `md` 12, `lg` 16, `xl` 20, `2xl` 24. Hoje `xl` vale 28. Antes de mudar, conferir com `grep "rounded-xl"` quantos lugares usam esse raio e aceitar a pequena diferença visual.

**VP.**

### 1.5 `useBreakpoint`

Arquivo novo: `mobile/src/hooks/use-breakpoint.ts`.

```ts
export type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop";
export function breakpointFor(width: number): Breakpoint {
  if (width >= 1280) return "desktop";
  if (width >= 1024) return "laptop";
  if (width >= 768) return "tablet";
  return "mobile";
}
export function useBreakpoint(): { bp: Breakpoint; atLeast: (b: Breakpoint) => boolean } { /* useWindowDimensions */ }
```

`breakpointFor` é puro e fica num arquivo separado (`lib/breakpoint.ts`), para poder ser testado. Teste novo em `test/breakpoint.test.ts`, incluído no script `test` da raiz.

**VP.**

### 1.6 XP

Arquivos novos:

- `mobile/src/lib/xp-rules.ts`: puro, sem `kv`.
  - Tipos `XpReason = "phase" | "card" | "speech" | "reconstruction" | "duel"`, `XpState = { log: Record<string, number>, awarded: Record<string, string[]>, goal: 20 | 50 | 100 }`.
  - `XP_TABLE`: phase 10, card 1 (limite 20), speech 5 (limite 1), reconstruction 20, duel 1 (limite 30).
  - `applyAward(state, reason, key, date): { state, gained }`. Respeita os limites diários e as chaves únicas. Uma chave repetida no mesmo dia rende 0.
  - `todayXp(state, date)`, `totalXp(state)`, `weekDots(dates: string[], today)`: devolve 7 booleanos, de segunda a domingo.
  - `pruneAwarded(state, today)`: descarta as chaves de dias anteriores.
- `mobile/src/lib/xp.ts`: guarda no `kv` com a chave `prosa.xp.v1`, usando `useSyncExternalStore` no mesmo padrão de `journey.ts`. Exporta `useXp()`, `awardXp(reason, key)`, `setXpGoal(goal)` e `resetXp()`.
- `mobile/src/lib/progress.ts`: `clearLocalProgress()` passa a chamar `resetXp()`.
- `test/xp.test.ts`, incluído no script `test`. Casos:
  - Fase rende 10.
  - A mesma fase no mesmo dia rende 0.
  - Cartas param em 20.
  - Duelo para em 30.
  - A troca de dia zera os limites.
  - A meta inválida cai para 50.
  - `weekDots` está correto.

**VP.** Fim da etapa: conferência no navegador. O app deve ter as cores e as fontes novas, com o layout antigo intacto.

---

## Etapa 2: componentes base

Pasta: `mobile/src/components/ui/`. Cada componente tem um arquivo próprio e é exportado por `index.ts`. Nenhuma cor fixa.

### 2.1 `Icon`

- Ampliar o `components/shell/icon.tsx` com `trail`, `bolt`, `brain`, `flame`, `star`, `check`, `x`, `plus`, `gear`, `crown`, `mic`, `speaker`, `more`, `arrowRight`, `arrowLeft`, `trophy`.
- Novas props `size` (padrão 24) e `strokeWidth` (padrão 1.75, contra 1.5 hoje).
- Também fica disponível como `ui/icon.ts`.

### 2.2 `Button`

- Props: `variant` (`primary | success | danger | secondary | ghost`), `size` (`md | lg`), `disabled`, `loading`, `icon`, `iconRight`, `fullWidth`, `onPress`, `accessibilityLabel`, `children`.
- 3D: `border-b-4` na cor `*Edge`. Pelo `pressed` do `Pressable`, aplica `translate-y-1 border-b-0` e `mt-1` para não deslocar o layout.
- Na web, hover com `brightness-105` (num `.web.tsx`, se o NativeWind não aplicar).
- `loading` mostra um `ActivityIndicator` e ignora novos cliques, como o `ChunkButton` (o `ChunkButton` passa a usar o `Button` por dentro na Etapa 5).
- Acessibilidade: `accessibilityRole="button"` e `accessibilityState={{ disabled, busy: loading }}`.

### 2.3 `Card`

`variant`: `base | interactive | selected`. `padding`: `md | lg`. `onPress` opcional. Com `onPress`, vira `Pressable` com 3D e hover.

### 2.4 `ProgressBar`

- `value` (0–1), `tone` (`primary | success | xp | streak`), `size` (`md | lg`).
- Variante `segments: { key, label, value, state: "done" | "active" | "todo" }[]`.
- A largura é animada com Reanimated (`withTiming` de 320 ms) e respeita `useReducedMotion`.

### 2.5 `StatPill`, `StatCard`, `Badge`, `Chip`, `Medal`, `TrailNode`

Seguem a tabela da spec (seção 3.5). O pulso do `TrailNode today` usa Reanimated em loop e fica desligado com movimento reduzido.

### 2.6 `Tooltip`

`tooltip.web.tsx` mostra o rótulo em hover e foco, posicionado acima. `tooltip.tsx` (nativo) devolve só os `children`.

### 2.7 `Sheet`

- Props: `open`, `onClose`, `title`, `children`, `footer`.
- A partir de `laptop`: `Modal` transparente com o cartão centralizado (máximo 520 px).
- Abaixo disso: folha ancorada embaixo.
- `Esc` fecha na web, e o foco vai para o título ao abrir.

### 2.8 `TextField`

- Mesmas props do `SoftInput`, mais `helper` e `error`.
- Borda 2 px, que vira `xp` no foco e `danger` com erro.
- O `SoftInput` passa a reexportar o `TextField`.

### 2.9 Catálogo `/dev/ui`

Arquivo `mobile/src/app/dev/ui.tsx`. Se `!__DEV__`, faz `<Redirect href="/" />`. Mostra todos os componentes, em todas as variantes e estados, com um interruptor de tema. Também é registrado no `Stack` do `_layout`.

**VP** depois de cada componente. Fim da etapa: prints do `/dev/ui` nos dois temas.

---

## Etapa 3: estrutura da tela

### 3.1 Inventário de navegação

Antes de mover arquivos: `grep` de `router.push`, `router.replace`, `href=`, `Redirect` e `pathname ===` em `mobile/src`. O resultado vira uma tabela em `scratch/` para checagem. As URLs não mudam, então nenhuma chamada precisa ser editada. O inventário confirma isso.

### 3.2 Componentes de layout

Pasta: `mobile/src/components/layout/`.

- `Sidebar` e `NavItem`: o modo expandido ou só com ícones vem do `useBreakpoint`. Contém o menu "Mais", com as entradas do `AccountMenu` atual, e o `LanguageSwitcher`, que vai para a coluna lateral.
- `RightRail`: `StatPill`s, meta (`useXp`), revisões (`countDue`), semana (`weekDots` com as datas de `progress.history`) e o slot `aside`.
- `Page`: `title`, `subtitle`, `aside`, `children`. Publica o `aside` para o `RightRail` por um contexto (`RailContext`).
- `AppShell`: a barra lateral, a área de rolagem com o `Page` e o `RightRail`. Rolagem só no centro, com `sticky` num `.web.tsx`. Inclui a faixa de API fora do ar (`pingApi`).
- `FocusShell`: barra do topo (`onClose`, `progress`, `clock`, `xp`, `menu`), conteúdo de até 720 px e `footer` com estado `feedback: null | { tone: "success" | "danger", title, detail }`.
- `PublicShell`: centralizado, até 440 px, e faixa lateral a partir de `laptop`.

### 3.3 Grupos de rota

- Criar `src/app/(app)/_layout.tsx` (`AppShell` em volta do `Slot`), `src/app/(focus)/_layout.tsx` (só um `Slot`, porque cada tela monta o próprio `FocusShell`) e `src/app/(public)/_layout.tsx`.
- Mover os arquivos conforme a spec (seção 4.1), com `git mv`:
  - `(tabs)/index.tsx` → `(app)/index.tsx`. Remover `(tabs)/_layout.tsx`, `components/app-tabs*.tsx` se não forem mais usados, e o grupo `(session)` → `(focus)`.
  - `(onboarding)/quiz.tsx` → `(focus)/quiz.tsx`.
- Atualizar o `Stack` do `_layout.tsx` raiz: `(public)` fora do `Stack.Protected`, `(app)` e `(focus)` dentro.
- Nesta tarefa, cada tela continua com o próprio `<AppFrame>`. Para não haver barra duplicada, o `AppFrame` ganha a prop `bare`, que pula o cabeçalho quando a tela já está dentro do `AppShell`. Na prática, o `AppFrame` detecta o `RailContext` e se comporta como `bare` sozinho.

### 3.4 Rota `/profile`

Criar `src/app/(app)/profile.tsx` provisório com `<Page title="Perfil">`, reaproveitando `FluencyMeterCard`, `PlacementCard` e `BadgeGallery` como estão. O redesign completo é a tarefa 4.3.

**VP.** Fim da etapa: percorrer todas as rotas da spec (seção 4.1) no navegador e confirmar que nenhuma quebra, que o login redireciona e que `/start` continua sendo forçado antes do fim do primeiro dia.

---

## Etapa 4: telas

Antes de cada tela: escrever o subplano aqui, com a tela atual lida e a lista de componentes, estados e chamadas. Depois: **VP**, prints em 1440, 1280 e 1024 px nos dois temas, e commit.

| # | Tela | Arquivos principais |
| --- | --- | --- |
| 4.1 | Aprender | `(app)/index.tsx`, `components/home/today-card.tsx`, `components/home/day-trail.tsx`, `lib/trail.ts` (montagem pura da trilha a partir do histórico, com teste) |
| 4.2 | Lição | `(focus)/daily.tsx`, `hooks/use-daily-session.ts`, `components/session/stage-frame.tsx`, `components/session/finish-screen.tsx`, `hooks/use-hotkeys.ts`, e o visual das etapas em `components/session/*-stage.tsx` |
| 4.3 | Perfil | `(app)/profile.tsx`, `components/profile/*` |
| 4.4 | Memória | `(app)/memory.tsx`, `components/home/retention-*.tsx` |
| 4.5 | Praticar, Duelo, Cena | `(app)/practice.tsx`, `(focus)/duel.tsx`, `(focus)/persona.tsx`, `components/duel/duel-screen.tsx`, `components/persona/persona-screen.tsx` |
| 4.6 | Notícias | `(app)/news.tsx`, `components/home/daily-news.tsx` (dividir), `components/home/news-dictogloss.tsx` |
| 4.7 | Entrada e onboarding | `(public)/account.tsx`, `(public)/reset.tsx`, `(focus)/start.tsx`, `(focus)/quiz.tsx` (dividir) |
| 4.8 | Secundárias | `settings` (dividir por seção), `guide`, `paywall`, `score`, `pairs`, `life`, `org`, `dossier`, `admin`, `cert` |

## Etapa 5: acabamento do desktop

1. Microinterações: contagem de XP, confete no fecho (Reanimated, sem dependência nova), entrada de páginas e itens com atraso escalonado de 30 ms.
2. Auditoria de contraste: um script em `scratch/` calcula a razão de cada par da spec (seção 3.1) e ajusta o que falhar.
3. Teclado: percorrer cada tela só com `Tab`, `Enter`, `Esc` e os atalhos.
4. Estados vazio, carregando e erro em cada tela.
5. Limpeza: remover `AppFrame`, `Panel` (se ninguém usar), os apelidos de token, Source Sans 3, os `emerald-*` restantes (`grep` precisa dar zero) e os emojis usados como ícone.
6. Atualizar `docs/06-aplicativo.md` e o README (tipografia, tema, telas).

## Etapa 6: mobile

1. `BottomTabs` usando o `NavItem`, exibido no `AppShell` quando o tamanho é `mobile`.
2. `RightRail` compacto: faixa de `StatPill`s no topo. Meta e revisões vão para o fim da página.
3. `FocusShell`: rodapé com `useSafeAreaInsets` e `KeyboardAvoidingView` no diário.
4. Alvos de toque de 44 px ou mais (`grep` de `min-h-10` e `h-8` em elementos clicáveis).
5. Testes em 375 e 768 px na web e num aparelho real pelo Expo Go.
