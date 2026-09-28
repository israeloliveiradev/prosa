# Áudio e voz

A voz neural nasce no serviço `services/edge-tts`. A API guarda o MP3. O aplicativo toca. O aparelho não abre conexão com o Edge-TTS. A leitura, a fala e o viva-voz não usam o sintetizador do sistema.

## Serviço Python

`POST /v1/speak` recebe `{ "text", "lang", "voice"? }` e devolve JSON, não o binário:

```json
{
  "audio_base64": "...",
  "words": [{ "text": "Hello", "offset_ms": 0 }]
}
```

A comunicação pede `boundary="WordBoundary"`. A versão 7.2.7 do pacote, sem isso, marca a fronteira da frase e o offset deixa de servir para destacar palavra. O valor bruto está em ticks de 100 nanossegundos; `offset_ms` é esse número dividido por 10.000.

`GET /health` responde para o healthcheck do Compose.

A API só fala com `EDGE_TTS_URL` (no Compose, `http://edge-tts:8077`). Não há URL vinda do cliente.

## Catálogo

A voz padrão de cada idioma é a primeira da lista. Francisca é a padrão do português.

| Idioma | Padrão | Também disponíveis |
| --- | --- | --- |
| en | Ava | Andrew, Emma, Brian |
| es | Elvira | Álvaro, Dalia, Jorge |
| de | Katja | Conrad |
| fr | Denise | Henri |
| it | Elsa | Diego |
| ru | Svetlana | Dmitry |
| ja | Nanami | Keita |
| pt | Francisca | Antonio |

O mesmo catálogo está em `services/edge-tts/app.py`, em `src/services/voice-catalog.ts` e no seletor do aplicativo. Uma voz de outro idioma é 400. Uma língua sem entrada no catálogo também é 400.

A escolha da pessoa fica no aparelho, na chave `prosa.narrator.v1`. O rótulo na interface é "Voz", em sentença, não em caixa alta.

A frase de amostra do português é "Olá. Hoje eu leio com você."

## Dois caminhos no aplicativo

A narração parte a história em frases. `speakStory` e `speakStories` pedem `POST /api/v1/audio/speak-batch`, tocam a URL `/api/v1/audio/neural/:id` na hora e gravam a cópia local em segundo plano. A primeira frase começa antes das outras voltarem. Um token de geração impede que o fim de um áudio antigo mexa na tela depois que a pessoa avançou. `play` não incrementa esse token: quem incrementa é `stopAndUnload`.

A fila do viva-voz usa outro identificador, `sequenceId`. Tanto `play` quanto `stopAndUnload` o incrementam, então uma narração comum corta a fila, e parar a fila corta a narração.

## Fila do viva-voz

`handsFreeSteps` monta `intro`, e para cada frase `hear`, `gap`, `confirm`. No máximo dezesseis frases. `allSentences` parte em `.`, `!`, `?` e também em `。`, `！`, `？`. `sentencesOf`, usado na fala sombra, continua limitado a quatro frases e não usa esse corte japonês.

O silêncio dura 4000 ms e anda em fatias de 200 ms. Pausar segura o relógio. Próxima marca a unidade seguinte e abandona o trecho atual, inclusive o silêncio.

No modo nativo, `setAudioModeAsync` pede som no silencioso, `doNotMix`, reprodução em segundo plano e sem fone de ouvido forçado. O player ativa a tela bloqueada com título e artista "Prosa", sem seek.

No navegador, `navigator.mediaSession` recebe play, pause e `nexttrack`.

Sair da sessão chama `stopAndUnload`. Trocar de etapa pelo relógio não corta a fila. O botão Continuar corta.

## Cadência

A referência são os `offset_ms` da voz neural. A fala da pessoa são os `duration_ms` devolvidos pelo Gemini. A razão entre os dois marca apressou ou alongou. Barra vazia quando falta um dos lados. O aplicativo não tenta ler o volume do MP3.

## Upload

Shadowing e transcrição aceitam um arquivo de até 10 MiB, MIME de áudio (`audio/webm`, `audio/mpeg`, `audio/wav` e vizinhos). O nome do arquivo não vira caminho no disco: o buffer fica na memória e segue para o Gemini.

## Cache

O mesmo texto, idioma e voz não sintetizam de novo enquanto o Redis guarda `prosa:neural:v1:...`. Trocar a narradora muda a chave. Uma notícia ouvida de novo com outra voz pede `speak` outra vez e substitui URL, palavras e `voiceId`.

A rota do MP3 é a única que envia `cache-control: private, max-age=86400`. O resto da API manda `no-store`.
