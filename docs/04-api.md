# API

Base local: `http://127.0.0.1:3000`. Corpo JSON com `content-type: application/json`, salvo o envio de áudio, que é `multipart/form-data`.

Rotas com conta exigem `Authorization: Bearer <token>`. O token é o valor opaco devolvido no registro ou no login, não o hash.

## Saúde

`GET /health`

Sem autenticação e sem limite de taxa. `200` com `{ "status": "ok", "schema": "007_cognates" }` quando Postgres e Redis respondem. `503` com `status: unavailable` quando um deles falha.

## Conta

`POST /api/v1/auth/register`

E-mail em minúsculas, senha com pelo menos 8 caracteres, `native_lang`, `target_lang`, `level`. O par padrão do esquema, quando o cliente omite, segue o validador de `src/schemas/auth.ts`. Resposta com o token e o usuário. Limite: 8 por minuto.

`POST /api/v1/auth/login`

E-mail e senha. Credencial errada não revela qual dos dois falhou. Limite: 8 por minuto.

`POST /api/v1/auth/logout`

Apaga a sessão do token apresentado.

`GET /api/v1/auth/me`

Devolve a conta autenticada, com interesses.

## Quiz, trilhas e lição

`POST /api/v1/onboarding/quiz`

Até doze interesses. Atualiza interesses, nível e o par ativo. Limite: 8 por minuto.

`GET /api/v1/study/tracks`

Lista os pares da conta.

`POST /api/v1/study/activate`

Torna um par o ativo. A edição grátis não ganha um segundo par por aqui: a regra do plano continua valendo no serviço. Limite: 30 por minuto.

`POST /api/v1/lessons/generate`

Corpo com idioma alvo, idioma de apoio, nível e tema. Tema vazio cai no padrão do esquema. `cognate` opcional só pesa para quem não está autenticado. Com `Authorization` válido, o perfil e o modo cognato saem da conta, não do corpo.

Resposta: a lição (`title`, `story_text`, `translation`, `vocabulary`, `journal_prompt`) mais `anchors` quando o modo cognato abriu. Cabeçalho `x-prosa-cache: hit|miss`. Limite: 10 por minuto.

`POST /api/v1/lessons/generate-personalized`

Exige conta e um tema escolhido. A chave de cache inclui o hash dos interesses. Limite: 10 por minuto.

`GET /api/v1/cognates?through=&target=`

Lista âncoras do par. Apoio e alvo iguais devolvem lista vazia. Cada item tem `word`, `familiar`, `gloss` e `kind` (`true` ou `false`). Limite: 30 por minuto.

## Áudio

`GET /api/v1/audio/voices?lang=`

Catálogo daquele idioma. Português devolve Francisca e Antonio.

`POST /api/v1/audio/speak` e `POST /api/v1/tts/synthesize`

Corpo `{ "text", "lang", "voice"? }`. `lang` são duas letras. A voz, se vier, precisa pertencer àquele idioma; outra língua devolve 400. A resposta traz `audio_url` e `words` com `text` e `offset_ms`. Limite: 30 por minuto.

`GET /api/v1/audio/neural/:id`

O MP3. Limite: 60 por minuto.

`POST /api/v1/audio/transcribe`

Campo `audio` e campo `language`. A transcrição é do Gemini. Limite: 20 por minuto.

`POST /api/v1/audio/analyze-shadowing`

Comparação de texto com a referência. Limite: 20 por minuto.

`POST /api/v1/audio/analyze-shadowing-phonetic`

Acrescenta `cadence_match` e as barras. Palavra apressada ou alongada vem marcada. Limite: 20 por minuto.

## Diário, gramática, notícia

`POST /api/v1/journal/evaluate`

Texto do diário não vazio, no contexto da lição. Limite: 20 por minuto.

`POST /api/v1/journal/reconstruct`

Tentativa, história ideal, tradução, par e nível. Resposta com `score` de 0 a 100, `grammar` e `literals`. Limite: 10 por minuto.

`POST /api/v1/grammar/deconstruct`

Uma frase. Quatro blocos na ordem sujeito, conector, verbo, objeto. Limite: 10 por minuto.

`POST /api/v1/grammar/vary`

Os quatro blocos já escolhidos. Devolve a frase e o áudio. Limite: 10 por minuto.

`POST /api/v1/news/fetch-adapted`

Interesse opcional, índice, faixa e voz. A notícia reescrita inclui vocabulário e URL de áudio. Limite: 10 por minuto.

## Memória

`POST /api/v1/srs/sync`

`user_id` precisa ser o da conta do token. Cada revisão tem `client_id`, frente, tradução, contexto e qualidade 0, 3, 4 ou 5. O mesmo `client_id` não aplica o SM-2 duas vezes. Limite: 30 por minuto.

`POST /api/v1/srs/mnemonic`

Frente, tradução e frase. Se a carta não atingiu o limiar de falha, a resposta diz que o palácio ainda não abre. Limite: 8 por minuto.

`POST /api/v1/srs/retention`

Até 500 cartas, cada uma com `interval_days`, `status` e `phrase`. O servidor calcula dominadas, em decadência, em risco e a nota, e grava o dia. Limite: 30 por minuto.

## Duelo e cena

`POST /api/v1/duel/round`

Doze itens `{ prompt, options[4], answer }`. O idioma e o nível saem da conta. Limite: 8 por minuto.

`POST /api/v1/duel/score`

Pontos, combo e acertos dentro dos tetos da tabela. Limite: 10 por minuto.

`GET /api/v1/duel/leaderboard`

Melhor nota por conta no idioma alvo da sessão. Limite: 30 por minuto.

`GET /api/v1/persona/scenes`

Cenas compatíveis com o idioma alvo e os interesses. Limite: 30 por minuto.

`POST /api/v1/persona/turn`

`scene_id`, `user_line` e até doze turnos anteriores (`persona` ou `learner`). Cena que não pertence àquele perfil devolve 404. A resposta tem `reply`, `tone`, `cultural_note` e `register`. Limite: 10 por minuto.

## Cobrança

`POST /api/v1/billing/checkout`

`success_url` e `cancel_url`. A URL de retorno local do paywall é aceita. Sem chaves Stripe, a rota não cria sessão. Limite: 10 por minuto.

`GET /api/v1/billing/sessions/:id`

Consulta a sessão. O id fora do formato Stripe é 400. Limite: 30 por minuto.

## Códigos que se repetem

| Código | Quando |
| --- | --- |
| 400 | JSON que não passa no Zod, ou voz de outro idioma |
| 401 | Bearer ausente onde a rota exige conta, ou token inválido |
| 403 | Um lote de revisão aponta para outra conta |
| 404 | Cena inexistente para aquele perfil, ou recurso ausente |
| 415 | Áudio num tipo que o Gemini não recebe |
| 502 | O modelo respondeu vazio, inválido ou fora do esquema |
| 503 | `GEMINI_API_KEY` vazia, ou saúde sem banco ou Redis |

O aplicativo traduz algumas dessas mensagens para português na tela de conta e nas falhas de geração.
