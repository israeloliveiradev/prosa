# Design System Prosa — Guia e Especificação

> **Status:** Primeira versão (após Task 2 do plano de refatoração).
> **Estrela-guia:** *"A mesa de estudo arrumada."*
> **Estilo Taste:** `framed-sheet` (`.taste-skill/direction.json`).
> **Contrato Impeccable:** `seed:60018bf9decc636b`.

---

## 1. Filosofia e Direção Visual

O Prosa troca a estética antiga (terracota e creme, fontes Newsreader e Nunito, botões 3D com borda inferior grossa e gamificação colorida) por uma interface de **toque macio, sóbria e focada**, no espírito de ferramentas modernas como Linear, Arc e Things.

### 1.1 Princípios Fundamentais
1. **Uma moldura, uma folha, um acento:**
   - A **moldura** tingida (`frame`: `#F2F5F7` no claro / `#101112` no escuro) segura a navegação (sidebar no desktop, barras superior e inferior no celular).
   - O trabalho fica numa **folha** branca recuada (`sheet`: `#FFFFFF` / `#17181A`) com cantos de 16 px, recuada 8 px da borda da janela no desktop.
   - Um **único acento** em petróleo (`accent`: `#1B6C80` / `#5BB3C8`) reservado estritamente para o que avança: o minuto atual da sessão, a palavra lida, a série principal de um gráfico ou o estado selecionado.
2. **Superfícies planas em repouso:**
   - Painéis e cards em repouso possuem borda de 1 px e **nenhuma sombra**.
   - Sombras sutis são reservadas exclusivamente para elementos que flutuam sobre outros (menus, popovers, diálogos e toasts).
3. **Vidro funcional, nunca decorativo:**
   - Efeito de vidro (`Glass`) apenas no que flutua sobre conteúdo que rola por baixo (barra superior e de abas no celular, folhas modais, popovers e toasts).
   - Painéis estáticos em repouso são sempre opacos.
4. **Tipografia com tarefas separadas:**
   - **IBM Plex Sans**: todo o texto de interface, comandos, rótulos e números tabulares.
   - **Literata**: exclusivamente para o texto que o estudante lê e analisa (histórias, notícias, frases da etapa de fala).
5. **Movimento como resposta:**
   - Toda animação é resposta a um gesto humano ou indicação de estado (escala 0,97 em 120 ms no toque, folhas com física de mola).
   - Telas não possuem animação de entrada; destinos de mesmo nível trocam sem deslizar.
   - Um único momento autoral de encanto: o fecho da sessão de 20 minutos (640 ms).

---

## 2. Tokens de Design

A fonte única de verdade é `mobile/src/design/tokens.ts`. O script `scripts/generate-tokens.ts` deriva automaticamente as variáveis CSS e a configuração do Tailwind.

### 2.1 Cores e Contraste (WCAG 2.2 AA)

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `frame` | `#F2F5F7` | `#101112` | Moldura externa e fundo da navegação |
| `sheet` | `#FFFFFF` | `#17181A` | Folha de trabalho, cards e modais |
| `raised` | `#F4F6F8` | `#1F2123` | Degrau sutil: poços, trilhos de progresso, esqueleto |
| `active` | `#E9EDF0` | `#27292C` | Item ativo da navegação, hover, seleção |
| `border` | `#E8EAEC` | `#2A2C2F` | Borda de 1 px de painéis e cards |
| `rule` | `#F0F1F2` | `#202224` | Divisores de linha |
| `control` | `#CDCED1` | `#45484C` | Borda de chips e segmentados |
| `controlStrong` | `#868B90` | `#6B7075` | Borda de campos de texto e checkboxes (>= 3:1) |
| `ink` | `#131416` | `#F3F4F5` | Texto principal (>= 16:1) |
| `muted` | `#5D5F60` | `#B4B7BA` | Texto secundário (>= 5,5:1) |
| `faint` | `#6B6B6B` | `#96999C` | Placeholders e metadados terciários (>= 4,5:1) |
| `primary` | `#1D1F20` | `#F3F4F5` | Botão primário (quase preto, invertido no escuro) |
| `onPrimary` | `#FFFFFF` | `#131416` | Rótulo sobre o botão primário |
| `accent` | `#1B6C80` | `#5BB3C8` | Acento de dados, foco e progresso |
| `accentSoft` | `#E3F0F3` | `#15343C` | Fundo de seleção e destaque |
| `positive` | `#1E7B4F` | `#3FC07A` | Sucesso e confirmação |
| `negative` | `#C4242A` | `#E5566F` | Erro e alerta crítico |
| `warning` | `#92400E` | `#E3A447` | Atenção |

### 2.2 Tipografia

- **Famílias:** `IBM Plex Sans` (400 Regular, 500 Medium, 600 SemiBold) e `Literata` (400 Regular, 600 SemiBold).
- **Escala de Tamanhos:**
  - `display`: 28/34 px (saudação inicial e fecho)
  - `title`: 22/28 px (h1 de cada tela; 24 px no desktop)
  - `section`: 16/22 px (título de cards e seções)
  - `subsection`: 14/20 px (cabeçalhos de grupos)
  - `body`: 14/20 px (corpo de texto e listas)
  - `bodyLarge`: 16/24 px (apoio e subtítulos)
  - `label`: 14/20 px a peso 500 (rótulos e botões)
  - `small`: 12/16 px (metadados e legendas; piso mínimo de 12 px)
  - `kpi`: 24/28 px tabular (números de resumo)
  - `kpiLead`: 32/36 px tabular (a métrica principal da tela)
  - `reading`: 18/30 px Literata (leitura contínua, máximo de 68 caracteres)
  - `input`: 16/24 px (campos de formulário; previne zoom no iOS)

### 2.3 Espaçamento, Raios e Elevação
- **Grade:** Múltiplos de 4 px.
- **Raios de Canto:**
  - `radius.control`: 6 px (botões, campos, switches)
  - `radius.card`: 8 px (cards, poços, retratos do elenco)
  - `radius.sheet`: 16 px (a folha de trabalho, folhas modais e diálogos)
  - `radius.chip`: 999 px (pílulas de status e chips)
- **Elevação:** Painéis em repouso usam borda de 1 px e sem sombra. Overlays (menus, toasts e diálogos) usam sombras suaves com dispersão ampla.

---

## 3. O que NUNCA Fazer (Anti-patterns Proibidos)

1. **Sem kickers/eyebrows:** Nunca colocar rótulo em caixa alta acima de um título h1.
2. **Sem botões 3D ou bordas deslocadas:** O botão `border-b-4` antigo está banido.
3. **Sem sombras em painéis normais:** Cards e folhas em repouso não possuem sombra.
4. **Sem cores de arco-íris para gamificação:** Contagens usam `ink` ou `muted`; o avanço usa `accent`. Violeta é terminantemente proibido.
5. **Sem textos com gradiente ou monoespaçada decorativa.**
6. **Sem emoji como ícone de interface:** Usar ícones de traço regular de 1,5 px em `components/shell/icon.tsx`.
7. **Sem animações sem saída ou de entrada de tela inteira.**

---

## 4. Primitivos e suas APIs (`mobile/src/ui/`)

Todos os primitivos do Prosa são implementados em `mobile/src/ui/` com suporte a temas, acessibilidade (WCAG 2.2 AA), testIDs obrigatórios e comportamento unificado web/nativo.

### 4.1 Grupo 1: Texto e Ícones
- **`Text` (`text.tsx`)**:
  - `variant`: `"display" | "title" | "section" | "subsection" | "body" | "bodyLarge" | "label" | "small" | "kpi" | "kpiLead" | "reading"`
  - `tone`: `"default" | "muted" | "faint" | "accent" | "positive" | "negative" | "warning" | "onPrimary"`
  - `weight`: `"regular" | "medium" | "semibold" | "bold"`
  - `align`: `"auto" | "left" | "right" | "center" | "justify"`
  - Web: `variant="title"` renderiza semântica de `h1` com `role="heading"` e `aria-level={1}`.
- **`Icon` (`icon.tsx`)**:
  - Ícones SVG vetoriais com traço regular de 1,5 px.
  - `name`: identificador do ícone.
  - `size`: número ou tamanho predefinido (`16`, `20`, `24`).
  - `color`: token semântico de cor (herda `currentColor` por padrão).

### 4.2 Grupo 2: Ações
- **`Button` (`button.tsx`)**:
  - `variant`: `"primary" | "secondary" | "ghost" | "danger"`
  - `size`: `"sm" | "md" | "lg"` (altura 36, 40 ou 48 px; touch target sempre >= 44x44 pt no celular)
  - `tone`: `"brand" | "neutral" | "negative"` (mapeia automaticamente para variant)
  - `loading`: booleano com indicador discreto e `accessibilityLabel="Carregando..."`
  - Feedback tátil háptico (`useHaptics`) e escala 0.97 no toque (120ms).
- **`IconButton` (`icon-button.tsx`)**:
  - Botão quadrado/circular para ícones com `accessibilityLabel` obrigatória e área de toque >= 44x44 pt.
- **`TextAction` (`text-action.tsx`)**:
  - Link de texto inline clicável com sublinhado no hover e foco visível.

### 4.3 Grupo 3: Superfícies
- **`Card` (`card.tsx`)**:
  - `variant`: `"default" | "elevated" | "interactive"`
  - `padding`: `"none" | "sm" | "md" | "lg"`
  - Fundo `sheet`, borda de 1 px `border`, zero sombra em repouso.
- **`Well` (`well.tsx`)**:
  - Superfície rebaixada com fundo `raised` para agrupamentos secundários e métricas.
- **`Surface` (`surface.tsx`)**:
  - Primitivo base com suporte a preenchimento, borda e raio semânticos.

### 4.4 Grupo 4: Controles de Formulário e Seleção
- **`Field` (`field.tsx`)**:
  - Campo de entrada com `label`, `error`, `hint`, `leftElement`, `rightElement`.
  - Altura de 44 px, prevenção de zoom no iOS (fonte 16 px base).
- **`OtpField` (`otp-field.tsx`)**:
  - Entrada de código de 6 dígitos para autenticação sem senha com foco automático entre células.
- **`Segmented` (`segmented.tsx`)**:
  - Alternador mutuamente exclusivo com fundo `raised` e polegar `sheet`.
- **`Tabs` (`tabs.tsx`)**:
  - Abas de navegação de seção com indicador em petróleo.
- **`Switch` (`switch.tsx`)**:
  - Interruptor de alternância booleana com acessibilidade `role="switch"` e `aria-checked`.
- **`Checkbox` (`checkbox.tsx`)**:
  - Caixa de seleção com contraste >= 3:1 na borda e marcação de verificação.
- **`RadioGroup` (`radio-group.tsx`)**:
  - Grupo de opções mutuamente exclusivas com suporte a navegação por teclado.
- **`Chip` (`chip.tsx`)**:
  - Pílula interativa de filtro e seleção com estado `selected`.
- **`Select` (`select.tsx`)**:
  - Caixa de seleção suspensa nativa/web com suporte a opções tipadas.

### 4.5 Grupo 5: Dados e Feedback
- **`Pill` (`pill.tsx`)**:
  - Pílula compacta de 22 px para status (`neutral`, `accent`, `positive`, `warning`, `negative`).
- **`ListRow` (`list-row.tsx`)**:
  - Linha de lista de dados com título, subtítulo, ação à direita e divisor de 1 px.
- **`Table` (`table.tsx`)**:
  - Grade tabular limpa para relatórios e listas densas.
- **`KpiStrip` (`kpi-strip.tsx`)**:
  - Faixa horizontal de métricas-chave com números tabulares e legendas.
- **`Progress` (`progress.tsx`)**:
  - Barra de progresso com trilho em `raised`, preenchimento em `accent` e `aria-label`.
- **`Skeleton` (`skeleton.tsx`)**:
  - Placeholder de carregamento com pulso suave e `role="status"`.
- **`EmptyState` (`empty-state.tsx`)**:
  - Estado vazio com ilustração/ícone, título, descrição e botão de ação primária.
- **`InlineError` (`inline-error.tsx`)**:
  - Mensagem de erro de formulário com ícone de alerta e leitor de tela associado.

### 4.6 Grupo 6: Camadas e Modais
- **`Glass` (`glass.tsx`)**:
  - Efeito de translucidez com `backdrop-filter: blur(12px)` no web e `expo-glass-effect` no iOS 26+.
- **`Sheet` (`sheet.tsx`)**:
  - Folha deslizante a partir da base (bottom sheet) com física de mola e fechamento no backdrop.
- **`Dialog` (`dialog.tsx`)**:
  - Modal de diálogo centralizado para confirmações destrutivas ou avisos importantes.
- **`Popover` (`popover.tsx`)**:
  - Camada flutuante ancorada com posicionamento relativo.
- **`Menu` (`menu.tsx`)**:
  - Menu de opções flutuante com itens acionáveis e suporte a atalhos de teclado.
- **`Tooltip` (`tooltip.tsx`)**:
  - Dica de ferramenta no hover (web) ou long press (touch).
- **`Toast` (`toast.tsx`)**:
  - Notificações transitórias leves montadas globalmente via `<Toaster />`.

### 4.7 Grupo 7: Elementos Visuais e Identidade
- **`Avatar` (`avatar.tsx`)**:
  - Avatar do estudante com iniciais ou imagem e borda sutil.
- **`Flag` (`flag.tsx`)**:
  - Bandeira estilizada de idioma (Inglês, Espanhol, Francês, etc.).
- **`PageHeader` (`page-header.tsx`)**:
  - Cabeçalho padronizado com título h1, subtítulo opcional e ações de topo (sem kickers).
- **`Stepper` (`stepper.tsx`)**:
  - Indicador de etapas ordenadas em caixa normal ("Passo 2 de 5").
- **`Kbd` (`kbd.tsx`)**:
  - Tecla de atalho estilizada em fonte mono tabular.

### 4.8 Hooks de Interface (`src/ui/hooks/`)
- **`useBreakpoint`**: Detecção de largura de tela (`phone` < 768px, `tablet` 768-1024px, `desktop` >= 1024px).
- **`usePointer`**: Detecção de capacidade de ponteiro fino (`fine` vs `coarse` touch).
- **`useReducedMotion`**: Detecção e respeito à preferência do sistema operacional para redução de animações.
- **`useHaptics`**: Disparo de feedback tátil háptico no nativo (`impact`, `selection`, `notification`).
- **`useFocusOnError`**: Foco automático acessível no primeiro campo com erro após validação de formulário.

