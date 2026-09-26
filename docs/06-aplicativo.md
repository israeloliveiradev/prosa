# Aplicativo

O aplicativo mora em `mobile/`. É Expo SDK 57, Expo Router, React Native 0.86, NativeWind 4 e Tailwind 3.4. O áudio é `expo-audio`. Não há `expo-av`.

O desenvolvimento web usado neste projeto sobe com:

```bash
cd mobile
npx expo start --web --port 8081
```

`CI=1` desliga o reload do Metro. Um arquivo salvo depois da subida pode encerrar o processo. Nesse caso o servidor é iniciado de novo na mesma porta.

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
| `src/app/paywall.tsx` | `/paywall` | Prosa Pro |
| `src/app/account.tsx` | `/account` | Entrar, sair, idioma e interesses |
| `src/app/(onboarding)/quiz.tsx` | `/quiz` | Interesses e nível |

O quadro `AppFrame` desenha a barra lateral a partir de 1024 px e, abaixo disso, o menu hambúrguer. A barra é sempre escura (`#181515`), nos dois temas. Não há barra inferior.

## Tema

Só existem claro e escuro. A preferência fica em `prosa.theme.v1`. Um valor antigo `system`, ou a ausência de valor, vira claro e é gravado assim.

A leitura acontece na primeira montagem do `ThemeProvider`, antes do efeito, e aplica a classe `light` ou `dark` no documento e o `colorScheme` do NativeWind. O interruptor no pé do menu chama `setPreference`, que grava e aplica na hora.

Claro: papel `#F9F8F6`, tinta `#2A211E`, ação `#4A1E24`, texto sobre a ação `#F9F8F6`, musgo `#3B4A3A`.

Escuro: papel `#141110`, cartão `#241E1C`, tinta `#F9F8F6`. A ação vira `#E8D5C8` com texto `#4A1E24`, porque o bordô em cima do papel escuro não sustenta contraste.

Os botões de ação usam `text-onEmber`. O Tailwind não aplica opacidade em cima de `var()` de cor de forma confiável; o tema usa cores inteiras. Sombra vai em `boxShadow`, não nas props `shadow*`.

As fontes nomeadas no Tailwind são Playfair Display para o título e Plus Jakarta Sans para a interface. O raio dos controles fica entre 16 e 24 px, com pílulas onde o botão é a ação principal.

## Estado neste aparelho

`mobile/src/lib/progress.ts` guarda a lição de hoje, o deck, o histórico, a fila de revisões, a âncora de reconstrução, os selos e as chaves cognatas. A edição grátis mantém um item de histórico. A Pro mantém até noventa.

A fila de revisões sincroniza com `POST /api/v1/srs/sync` quando há sessão e rede. O mesmo `client_id` torna o envio idempotente.

A sessão da conta fica em `prosa.session.v1`.

## Áudio na interface

`AudioService` é um singleton. Parar descarrega o player. Na web, pausar a liberação zera `src`, senão o elemento continua. Na leitura, avançar de frase ou desmontar a etapa passa por `stopAndUnload`.

O viva-voz está em `HandsFreePlayer`, montado na sessão para sobreviver à troca de etapa pelo relógio. Os controles são Pausar, Continuar, Próxima e Encerrar.

## O que cada etapa usa da API

A leitura pede `speak` e, no duplo toque, `grammar/deconstruct` e `grammar/vary`. A revisão aplica SM-2 no aparelho e enfileira o sync; o palácio pede `srs/mnemonic`. A fala manda o áudio para `analyze-shadowing-phonetic`. O diário pede `journal/evaluate`. A reconstrução pede `journal/reconstruct` e, ao ditar, `audio/transcribe`.

Nenhuma dessas telas importa `@google/genai` nem chama a porta 8077.

## Personagens

`Figure` carrega `mobile/assets/cast/clara.png`, `bento.png`, `nuno.png` e `lia.png`. O caminho do `require` sobe três níveis a partir de `src/components/cast/figure.tsx`, até `assets/cast`.
