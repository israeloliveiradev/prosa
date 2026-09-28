# Aplicativo

O aplicativo mora em `mobile/`. É Expo SDK 57, Expo Router, React Native 0.86, NativeWind 4 e Tailwind 3.4. O áudio é `expo-audio`. Não há `expo-av`.

O desenvolvimento web usado neste projeto sobe com:

```bash
cd mobile
npx expo start --web --port 8081
```

`CI=1` desliga o reload do Metro. Um arquivo salvo depois da subida pode encerrar o processo. Nesse caso o servidor é iniciado de novo na mesma porta.

`EXPO_PUBLIC_API_URL` aponta para a API. Sem ela, o cliente usa `http://127.0.0.1:3000`.

## Telas

| Arquivo | Rota | Papel |
| --- | --- | --- |
| `src/app/(tabs)/index.tsx` | `/` | Começar ou continuar a prosa, elenco, idioma do dia |
| `src/app/news.tsx` | `/news` | Notícia. Sem conta, pede entrada |
| `src/app/practice.tsx` | `/practice` | Atalhos para o duelo e a cena |
| `src/app/memory.tsx` | `/memory` | Mapa, deck, vocabulário, histórico, nichos, selos |
| `src/app/(session)/daily.tsx` | `/daily` | Os vinte minutos |
| `src/app/duel.tsx` | `/duel` | Duelo. Sem conta, volta para a conta |
| `src/app/persona.tsx` | `/persona` | Cena |
| `src/app/paywall.tsx` | `/paywall` | Prosa Pro. A confirmação do Stripe manda o Bearer |
| `src/app/account.tsx` | `/account` | Entrar, criar, verificar e-mail, 2FA, sair |
| `src/app/settings.tsx` | `/settings` | Nome, e-mail, senha, lembrete, elenco, tema |
| `src/app/reset.tsx` | `/reset` | Código de seis dígitos da carta de senha |
| `src/app/guide.tsx` | `/guide` | Como usar o aplicativo |
| `src/app/admin.tsx` | `/admin` | Resumo e plano das contas. Só admin |
| `src/app/(onboarding)/quiz.tsx` | `/quiz` | Interesses e nível |

O quadro `AppFrame` desenha a barra no topo. Abaixo de 1024 px o menu compacta. Não há barra inferior de abas.

## Tipografia

Newsreader 600 nos títulos (`font-display`). Source Sans 3 400 e 600 no corpo, rótulos e interface. Os dois pares vêm de `@expo-google-fonts`. Newsreader não entra em itálico: o itálico do Playfair anterior ficava ilegível.

No CSS global, `body` é Source Sans 3 16 px / 1.6. Títulos usam `clamp` (34–52 no display, 24–34 no headline). Rótulo mínimo 12 px. Em React Native Web, `Text` não pode ser `display: flex`; `keepWords()` troca espaço por `\u00A0` onde a linha não pode quebrar, e o CSS força `#root [class*="css-text"]` como `inline-block` com `white-space: pre-wrap`.

As cartas de e-mail repetem o mesmo par.

## Tema

Só existem claro e escuro. A preferência fica em `prosa.theme.v1`. Um valor antigo `system`, ou a ausência de valor, vira claro e é gravado assim.

Claro: papel `#FFF8F1`, tinta `#1C1917`, ação `#9A3412`, texto sobre a ação branco, musgo `#047857`.

Escuro: papel `#0E0C0B`, cartão `#1A1614`, tinta `#F6EDE6`. A ação vira `#E07A4A` com texto `#1C0A06`.

Os botões de ação usam `text-onEmber`. O Tailwind não aplica opacidade em cima de `var()` de cor de forma confiável; o tema usa cores inteiras. Sombra vai em `boxShadow`, não nas props `shadow*`.

O interruptor no menu chama `setPreference`, que grava e aplica na hora. NativeWind recebe a classe `light` ou `dark` no documento.

## Elenco

`Figure` carrega os PNG em `mobile/assets/cast/` pelos ids das dezesseis mentes. O caminho do `require` sobe três níveis a partir de `src/components/cast/figure.tsx`. Os arquivos `clara`, `bento`, `nuno` e `lia` não entram mais na UI. A paleta pedagógica e os prompts estão em `mobile/src/design/minds.ts`, iguais aos da API em `src/services/minds.ts`.

A conta grava o elenco nas quatro colunas `mind_*`. A lição leva esses ids no hash de cache, então trocar Einstein por Platão pede geração nova.

## Estado neste aparelho

`mobile/src/lib/progress.ts` guarda a lição de hoje, o deck, o histórico, a fila de revisões, a âncora de reconstrução, os selos e as chaves cognatas. A edição grátis mantém um item de histórico. A Pro mantém até noventa.

A fila de revisões sincroniza com `POST /api/v1/srs/sync` quando há sessão e rede. O mesmo `client_id` torna o envio idempotente. O `user_id` do lote é o da sessão; o servidor recusa lote de outra conta.

A sessão da conta fica em `prosa.session.v1`.

O guia da primeira visita fica em `prosa.guide.v1`. A folha do Início tem Pular. Cada área (prosa, notícias, prática, memória) mostra uma frase só na primeira vez. Conta reabre `/guide`.

A narradora fica em `prosa.narrator.v1`.

Botões de envio (`ChunkButton`) desligam enquanto `pending` é verdadeiro, para o clique duplo não disparar dois registros ou dois checkouts. O servidor ainda tem a trava Redis.

## Áudio na interface

`AudioService` é um singleton. Parar descarrega o player. Na web, pausar a liberação zera `src`, senão o elemento continua. Na leitura, avançar de frase ou desmontar a etapa passa por `stopAndUnload`.

O viva-voz está em `HandsFreePlayer`, montado na sessão para sobreviver à troca de etapa pelo relógio. Os controles são Pausar, Continuar, Próxima e Encerrar.

## O que cada etapa usa da API

A leitura pede `speak-batch` frase a frase e, no duplo toque, `grammar/deconstruct` e `grammar/vary`. A revisão aplica SM-2 no aparelho e enfileira o sync; o palácio pede `srs/mnemonic`. A fala manda o áudio para `analyze-shadowing-phonetic`. O diário pede `journal/evaluate`. A reconstrução pede `journal/reconstruct` e, ao ditar, `audio/transcribe`.

Nenhuma dessas telas importa `@google/genai`, nem chama Stripe, nem abre a porta 8077.

O paywall pede `startCheckout` com `window.location.origin/paywall` na web ou `prosa://paywall` no nativo. A volta com `session_id` chama `confirmCheckout(token, sessionId)`.

## Conta na interface

Registro e login compartilham a tela `/account`. Se a API devolve `requires_verify`, a mesma tela pede o código de seis dígitos. `requires_2fa` pede TOTP, carta ou recuperação. A carta de verificação e a de reset usam o layout institucional; no Docker local, Configurações aponta para `http://localhost:8025` (Mailpit).

## Acessibilidade e texto

`keepWords` evita quebra no meio de um trecho marcado. Alertas usam `accessibilityRole="alert"`. Contraste do par terracota/creme foi o critério do tema, não uma paleta infantil da skill de UI.
