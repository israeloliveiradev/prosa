# API

Base local: `http://127.0.0.1:3000`. Corpo JSON com `content-type: application/json`, salvo o envio de áudio, que é `multipart/form-data`.

Rotas com conta exigem `Authorization: Bearer <token>`. O token é o valor opaco devolvido depois da verificação do e-mail ou do login, não o hash. Conta sem `email_verified_at` não passa em `requireUser`.

CORS só reflete origens da allowlist. Métodos: GET, HEAD, POST, PATCH, OPTIONS.

## Saúde

`GET /health`

Sem autenticação e sem limite de taxa. `200` com `{ "status": "ok", "schema": "015_verify" }` quando Postgres e Redis respondem. `503` com `status: unavailable` quando um deles falha.

## Conta e autenticação

`POST /api/v1/auth/register`

E-mail em minúsculas, senha com 8 a 72 caracteres, `native_lang`, `target_lang`, `level`. Sem correio configurado: 503. Com correio: `201` `{ requires_verify: true, email }`, sem sessão. Clique duplo no mesmo e-mail em 8 segundos: 409. E-mail já cadastrado: 409. Limite: 8 por minuto.

`POST /api/v1/auth/verify`

E-mail e código de seis dígitos. Consome o Redis, preenche `email_verified_at`, devolve token e usuário. Código errado incrementa lockout. Limite: 8 por minuto.

`POST /api/v1/auth/verify/resend`

Sempre `{ ok: true }`, para não enumerar contas. Só envia se a conta existe e ainda não foi verificada. Limite: 5 por minuto.

`POST /api/v1/auth/login`

E-mail e senha. Credencial errada não revela qual dos dois falhou. Dez falhas em quinze minutos: 429. Conta não verificada devolve `{ requires_verify: true, email }` e tenta reenviar o código. Se 2FA está ligado, devolve `{ requires_2fa, ticket, methods }` em vez da sessão. Limite: 8 por minuto.

`POST /api/v1/auth/2fa`

Ticket e código (TOTP, e-mail ou recuperação). Ticket hashado no Redis, 5 minutos. Limite: 12 por minuto.

`POST /api/v1/auth/logout`

Apaga a sessão do token apresentado.

`POST /api/v1/auth/forgot`

Sempre `{ ok: true }`. Só envia carta se a conta existe e o correio está ligado. Limite: 5 por minuto.

`POST /api/v1/auth/reset`

E-mail, código e senha nova. Apaga todas as sessões da conta. Limite: 8 por minuto.

`GET /api/v1/auth/me`

Devolve a conta autenticada, com interesses, `role`, sequência, freeze, locale e as quatro mentes. Um e-mail listado em `ADMIN_EMAILS` passa a `admin` neste pedido.

## Preferências da conta

`GET /api/v1/account/settings` e `PATCH /api/v1/account/settings`

Nome, locale, lembrete, elenco. `mail_inbox_url` só volta se for loopback (Mailpit).

`POST /api/v1/account/password`

Senha atual e nova. As outras sessões caem; a atual permanece.

`POST /api/v1/account/email/request` e `POST /api/v1/account/email/confirm`

Pedido pede a senha. A carta vai para o endereço novo. Confirmar grava o e-mail e `email_verified_at = now()`, e derruba as outras sessões.

`POST /api/v1/account/2fa/totp/start` e `.../confirm`

Começa com o segredo no Redis. Confirmar liga TOTP e devolve oito códigos de recuperação uma vez.

`POST /api/v1/account/2fa/totp/disable`

Senha e um fator válido.

`POST /api/v1/account/2fa/email/start` e `.../confirm`

O start só envia o código; o fator só liga no confirm.

`POST /api/v1/account/2fa/email/disable`

Pede a senha.

## Quiz, trilhas e lição

`POST /api/v1/onboarding/quiz`

Até doze interesses. Atualiza interesses, nível e o par ativo. Limite: 8 por minuto.

`GET /api/v1/study/tracks`

Lista os pares da conta.

`POST /api/v1/study/activate`

Torna um par o ativo. A edição grátis não ganha um segundo par por aqui. Limite: 30 por minuto.

`POST /api/v1/lessons/generate`

Corpo com idioma alvo, idioma de apoio, nível e tema. Tema vazio cai no padrão do esquema. `cognate` opcional só pesa para quem não está autenticado. Com `Authorization` válido, o perfil, o elenco e o modo cognato saem da conta, não do corpo.

Resposta: a lição (`title`, `story_text`, `translation`, `vocabulary`, `journal_prompt`) mais `anchors` quando o modo cognato abriu. Cabeçalho `x-prosa-cache: hit|miss`. Limite: 10 por minuto.

Sem Bearer, a geração anônima segue as regras da edição grátis. Bearer inválido é 401.

`POST /api/v1/lessons/generate-personalized`

Exige conta e um tema escolhido. A chave de cache inclui o hash dos interesses e o elenco. Limite: 10 por minuto.

`GET /api/v1/cognates?through=&target=`

Lista âncoras do par. Apoio e alvo iguais devolvem lista vazia. Cada item tem `word`, `familiar`, `gloss` e `kind` (`true` ou `false`). Limite: 30 por minuto.

## Áudio

`GET /api/v1/audio/voices?lang=`

Catálogo daquele idioma. Português devolve Francisca e Antonio.

`POST /api/v1/audio/speak` e `POST /api/v1/tts/synthesize`

Corpo `{ "text", "lang", "voice"? }`. `lang` são duas letras. A voz, se vier, precisa pertencer àquele idioma; outra língua devolve 400. A resposta traz `audio_url` e `words` com `text` e `offset_ms`. Limite: 30 por minuto. Visitante autenticado ou não pode falar; o teto por IP segura abuso.

`POST /api/v1/audio/speak-batch`

Corpo `{ "texts": string[], "lang", "voice"? }`. De 1 a 16 frases. A resposta traz `clips` na mesma ordem. O limite de 30 vale por lote.

`GET /api/v1/audio/neural/:id`

O MP3. O id é 64 hex. Limite: 60 por minuto.

`POST /api/v1/audio/transcribe`

Campo `audio` (MIME de áudio) e campo `language`. A transcrição é do Gemini. Limite: 20 por minuto.

`POST /api/v1/audio/analyze-shadowing`

Comparação de texto com a referência. Limite: 20 por minuto.

`POST /api/v1/audio/analyze-shadowing-phonetic`

Acrescenta `cadence_match` e as barras. Limite: 20 por minuto.

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

Interesse opcional, índice, faixa e voz. A notícia reescrita inclui vocabulário e URL de áudio. O servidor só busca RSS em hosts allowlist. Limite: 10 por minuto.

## Memória

`POST /api/v1/srs/sync`

`user_id` precisa ser o da conta do token; outro id é 403. Cada revisão tem `client_id`, frente, tradução, contexto e qualidade 0, 3, 4 ou 5. O mesmo `client_id` não aplica o SM-2 duas vezes. Limite: 30 por minuto.

`POST /api/v1/srs/mnemonic`

Frente, tradução e frase. Se a carta não atingiu o limiar de falha, a resposta diz que o palácio ainda não abre. Limite: 8 por minuto.

`POST /api/v1/srs/retention`

Até 500 cartas. O servidor calcula dominadas, em decadência, em risco e a nota, e grava o dia. Limite: 30 por minuto.

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

`scene_id`, `user_line` e até doze turnos anteriores. Cena que não pertence àquele perfil devolve 404. Limite: 10 por minuto.

## Cobrança

`GET /api/v1/billing/status`

Sem autenticação. `{ "configured": true | false }`.

`POST /api/v1/billing/checkout`

Exige conta. `success_url` e `cancel_url` precisam ser origem da allowlist ou `prosa://paywall`. Credenciais na URL são recusadas. Sem Stripe: 503. Clique duplo em 20 segundos: 409. Limite: 10 por minuto.

`GET /api/v1/billing/sessions/:id`

Exige conta. O id fora do formato `cs_[A-Za-z0-9_]+` é 400. Se `client_reference_id` não é a conta do token, 404. Só então, se o pagamento está completo, `UPDATE users SET plan = 'pro' WHERE id = conta autenticada`. Limite: 30 por minuto.

## Administração

As rotas exigem sessão de uma conta com `role = admin`. Quem não é admin recebe 403. A senha nunca volta. A busca por e-mail escapa `%` e `_`.

`GET /api/v1/admin/dashboard`

Contas, planos, lições e duelos de hoje, áudios sintetizados, falhas do Gemini, interruptor da geração, se Stripe e Gemini estão ligados, série de 14 dias e os últimos eventos. Limite: 30 por minuto.

`GET /api/v1/admin/summary`

Resumo curto das contas. Limite: 30 por minuto.

`GET /api/v1/admin/events?kind=&limit=`

Fila de operação. `kind` é `gemini`, `lesson`, `audio`, `news` ou `billing`. Limite: 30 por minuto.

`POST /api/v1/admin/generation`

Corpo `{ "paused": true | false }`. Pausa a geração nova. Cache e última notícia continuam. Limite: 20 por minuto.

`GET /api/v1/admin/users?q=&plan=&role=`

Até 80 contas. Limite: 30 por minuto.

`GET /api/v1/admin/users/:id`

Detalhe da conta, últimas 14 lições e duelos. O id é UUID. Limite: 30 por minuto.

`POST /api/v1/admin/users/:id/plan`

Corpo `{ "plan": "free" | "pro" }`. Limite: 20 por minuto.

`POST /api/v1/admin/users/:id/freeze`

Corpo `{ "delta": 1 | -1 }`. Limite: 20 por minuto.

## Códigos que se repetem

| Código | Quando |
| --- | --- |
| 400 | JSON que não passa no Zod, URL de retorno fora da allowlist, voz de outro idioma, código expirado |
| 401 | Bearer ausente onde a rota exige conta, token inválido, ou conta ainda sem e-mail verificado |
| 403 | Origin recusada, lote de revisão de outra conta, ou aluno numa rota admin |
| 404 | Cena inexistente, sessão Stripe de outra conta, ou recurso ausente |
| 409 | E-mail já cadastrado, ou pedido duplicado (registro / checkout) |
| 415 | Áudio num tipo que o Gemini não recebe |
| 429 | Limite de taxa ou lockout de autenticação |
| 502 | O modelo ou o provedor de pagamento falhou; o texto é genérico |
| 503 | Correio ou Stripe desligados, geração indisponível, Gemini ocupado, saúde sem banco ou Redis |

O aplicativo traduz algumas dessas mensagens para português na tela de conta e nas falhas de geração.
