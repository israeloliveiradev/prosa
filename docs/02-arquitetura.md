# Arquitetura

O Prosa é três processos de aplicação, um de correio local e dois de dados, todos no Compose, na rede `prosa`.

```text
mobile (Expo, porta 8081 no desenvolvimento)
        |
        |  HTTP local, JSON, Bearer
        v
    prosa-api (Fastify, 127.0.0.1:3000)
        |                 \
        |                  \  HTTP JSON { audio_base64, words }
        |                   v
        |              prosa-edge-tts (127.0.0.1:8077)
        |
        +-- prosa-postgres (127.0.0.1:5433 -> 5432)
        +-- prosa-redis    (127.0.0.1:6380 -> 6379)
        +-- prosa-mailpit  (127.0.0.1:8025 UI, 1025 SMTP)
```

O host publica só em `127.0.0.1`. Dentro da rede, a API usa `postgres`, `redis`, `http://edge-tts:8077` e `mailpit:1025`.

## Por que estes processos

A geração de texto fica na API para a chave do Gemini não chegar ao aplicativo. A síntese fica num serviço Python porque o pacote `edge-tts` é Python. O Postgres guarda o que precisa durar: contas, cartas, lições em cache, duelos, cognatos, retenção, sessões. O Redis guarda o que pode expirar ou servir de trava: lição quente, MP3 neural, limite de taxa, códigos de e-mail, lockout, idempotência. O Mailpit recebe as cartas no desenvolvimento; em produção entra SMTP, Resend ou Brevo.

Não há Supabase. Não há RLS. A autorização é a sessão da aplicação.

## API

`src/server.ts` carrega o ambiente com Zod e escuta `HOST`:`PORT`. `src/app.ts` monta o Fastify, o pool, o Redis, o CORS pela allowlist (`APP_PUBLIC_URL`, `http://localhost:8081`, `http://127.0.0.1:8081` e `CORS_ORIGINS`), os cabeçalhos `nosniff` / `DENY` / `no-store`, e o limite global de 120 pedidos por minuto no namespace Redis `prosa-rl:`. A rota `/health` fica fora desse limite.

O corpo JSON aceita até 1 MiB. O multipart de áudio aceita um arquivo de até 10 MiB, um arquivo por pedido, quatro campos.

Pedidos que mutam e trazem `Origin` fora da allowlist recebem 403. Pedidos sem `Origin` (nativo, curl, healthcheck) seguem.

O log redige `authorization`, `password`, `current_password`, `code` e `ticket`. Erros de validação Zod viram 400 sem o corpo cru. `AppError` carrega o status. Falha do modelo vira 502 com texto controlado. Chave do Gemini vazia vira 503 `"Lesson generation is unavailable"`. Mensagens 5xx que parecem segredo viram `"Internal server error"`.

A documentação da superfície HTTP está em [API](04-api.md). A lista do que foi endurecido está em [Segurança](08-seguranca.md).

## Modelo

`GeminiGateway` usa `@google/genai`. O modelo vem de `GEMINI_MODEL`. O padrão do código, se a variável faltar, é `gemini-2.5-flash`.

Toda resposta de conteúdo pede `responseMimeType: application/json`, um `responseJsonSchema` e `thinkingBudget: 0`. O texto volta, passa por `JSON.parse` e por um esquema Zod. Não há leitura de prosa livre para decidir o formato.

A transcrição manda o áudio como `inlineData`. O mesmo caminho mede a duração das palavras faladas. Não existe chamada à API da OpenAI nem ao Whisper.

A voz da lição inclui o `lessonVoicePrompt` das quatro mentes escolhidas.

## Cache da lição

A chave lógica é montada em `lessonCacheHash`:

```text
${target}:${level}:${sha256(tema normalizado)}
```

Acréscimos, quando existem:

| Sufixo | Quando |
| --- | --- |
| `:from:${through}` | a explicação é através de outro idioma |
| `:i:${hash16 dos interesses}` | a lição é personalizada |
| `:cognate` | a lição A1 é de cognatos |
| `:m:${reading}:${memory}:${speech}:${journal}` | o elenco da conta |

O tema é normalizado antes do hash: caixa e espaços repetidos não criam outra lição.

A leitura tenta o Redis `prosa:lesson:v1:${hash}` e depois `lesson_cache` no Postgres, com `INSERT ... ON CONFLICT DO NOTHING`. O cabeçalho `x-prosa-cache` diz `hit` ou `miss`. Uma geração que perde a corrida espera o lock `prosa:lesson-lock:${hash}`, criado com `SET NX EX 45`. O TTL quente é `LESSON_CACHE_TTL_SECONDS`, 86400 por padrão.

Os âncoras de cognato não entram no blob. Eles são lidos na resposta.

## Cache do áudio neural

A chave é `prosa:neural:v1:${sha256(lang + voz + texto)}`. O valor é o MP3 e, ao lado, o JSON de palavras com `offset_ms`. O TTL acompanha o da lição. `GET /api/v1/audio/neural/:id` devolve `audio/mpeg` com `cache-control: private, max-age=86400`. O id é hex SHA-256; outro formato é 400.

## Sessão e fatores

O registro grava Argon2id (`memoryCost` 19456, `timeCost` 2, `parallelism` 1) em `users.password_hash`. O login compara o hash e, se a conta não existe, ainda assim calcula um hash de preenchimento para não vazar timing.

A sessão é 32 bytes aleatórios em base64url. O banco guarda o SHA-256. O cliente manda `Authorization: Bearer`. O token no fio precisa casar `^[A-Za-z0-9_-]{43,128}$`. A sessão dura 30 dias. `requireUser` só aceita sessão de conta com `email_verified_at` preenchido.

Códigos de verificação, reset e OTP de e-mail vivem no Redis com o SHA-256 do e-mail ou do propósito, nunca o valor cru. O ticket de 2FA é aleatório; o Redis guarda o hash do ticket, não o ticket.

Login, verificação, reset e 2FA têm lockout: dez falhas na mesma identidade em quinze minutos viram 429. Registro e checkout também usam `SET NX` curto para o clique duplo não criar duas contas ou duas sessões Stripe.

## Correio

`Mailer` escolhe o primeiro canal configurado: Mailjet, depois Resend, depois Brevo, depois SMTP (`SMTP_HOST` / `SMTP_PORT`). Com Mailjet, Resend ou Brevo, o Mailpit local não entra na rota. O envelope SMTP rejeita CR, LF e endereço que não passa no validador. As cartas são HTML multipart com Newsreader e Source Sans 3, geradas em `src/services/mail-templates.ts`. O Mailpit local aparece só se o canal ativo for SMTP no host `mailpit`.

## Notícia

Os feeds vêm de um conjunto fechado de hosts HTTPS (`news.google.com`, BBC, Tagesschau, ANSA, NHK, The Verge). O `fetch` não segue redirecionamento. Um host fora da lista não é lido.

## Limites

Além do teto global de 120 por minuto:

| Rota | Por minuto |
| --- | --- |
| Registro, login, verificar | 8 |
| Reenviar verificação e esqueci a senha | 5 |
| Reset de senha | 8 |
| 2FA | 12 |
| Quiz de interesses | 8 |
| Gerar lição | 10 |
| Lição personalizada | 10 |
| Notícia | 10 |
| Falar (`speak` e lote) | 30 |
| GET do MP3 | 60 |
| Shadowing e transcrição | 20 |
| Diário | 20 |
| Reconstrução | 10 |
| Gramática, desconstruir e variar | 10 |
| Palácio | 8 |
| Sync do deck | 30 |
| Retenção | 30 |
| Ativar trilha | 30 |
| Cognatos | 30 |
| Duelo, rodada | 8 |
| Duelo, gravar | 10 |
| Placar | 30 |
| Cenas | 30 |
| Turno da cena | 10 |
| Checkout | 10 |
| Sessão de checkout | 30 |
| Administração (leitura) | 30 |
| Administração (escrita) | 20 |

## O que o Compose não recria à toa

Os volumes `prosa_postgres_data` e `prosa_redis_data` sobrevivem a `docker compose up -d --build`. Recriar a API ou o Edge-TTS com `--no-deps` evita derrubar o banco. `docker compose down -v` apaga os volumes. Não faz parte do fluxo normal.

A API e o Edge-TTS leem senhas só pelo `env_file`. O arquivo não é interpolado pelo Compose, então uma senha com `$` não é comida. O Dockerfile da API usa `USER node` e `npm ci --omit=dev`. `.dockerignore` deixa `secrets` fora da imagem.

## Saúde

`GET /health` faz `SELECT 1` e `PING` no Redis. Se um falha, 503 com `status: unavailable` e o nome do esquema. Se os dois respondem, 200 com `status: ok` e `schema`, hoje `015_verify`. O número muda quando uma migração nova passa a ser a versão declarada em `src/types/database.ts`.
