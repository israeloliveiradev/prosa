# Arquitetura

O Prosa é três processos de aplicação mais dois de dados, todos no Compose, na rede `prosa`.

```text
mobile (Expo, porta 8081 no desenvolvimento)
        |
        |  HTTPS ou HTTP local, JSON, Bearer
        v
prosa-api (Fastify, 127.0.0.1:3000)
        |                 \
        |                  \  HTTP JSON { audio_base64, words }
        |                   v
        |              prosa-edge-tts (127.0.0.1:8077)
        |
        +-- prosa-postgres (127.0.0.1:5433 -> 5432)
        +-- prosa-redis    (127.0.0.1:6380 -> 6379)
```

O host publica só em `127.0.0.1`. Dentro da rede, a API usa `postgres`, `redis` e `http://edge-tts:8077`.

## Por que estes processos

A geração de texto fica na API para a chave do Gemini não chegar ao aplicativo. A síntese fica num serviço Python porque o pacote `edge-tts` é Python. O Postgres guarda o que precisa durar: contas, cartas, lições em cache, duelos, cognatos, retenção. O Redis guarda o que pode expirar ou servir de trava: lição quente, MP3 neural, limite de taxa.

Não há Supabase. Não há RLS. A autorização é a sessão da aplicação.

## API

`src/server.ts` carrega o ambiente com Zod e escuta `HOST`:`PORT`. `src/app.ts` monta o Fastify, o pool, o Redis, o CORS com `origin: true` e o limite global de 120 pedidos por minuto no namespace Redis `prosa-rl:`. A rota `/health` fica fora desse limite.

O corpo JSON aceita até 1 MiB. O multipart de áudio aceita um arquivo de até 10 MiB.

Erros de validação Zod viram 400. `AppError` carrega o status. Falha do modelo vira 502. Chave do Gemini vazia vira 503.

## Modelo

`GeminiGateway` usa `@google/genai`. O modelo vem de `GEMINI_MODEL`. O padrão do código, se a variável faltar, é `gemini-2.5-flash`.

Toda resposta de conteúdo pede `responseMimeType: application/json`, um `responseJsonSchema` e `thinkingBudget: 0`. O texto volta, passa por `JSON.parse` e por um esquema Zod. Não há leitura de prosa livre para decidir o formato.

A transcrição manda o áudio como `inlineData`. O mesmo caminho mede a duração das palavras faladas. Não existe chamada à API da OpenAI nem ao Whisper.

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

O tema é normalizado antes do hash: caixa e espaços repetidos não criam outra lição.

A leitura tenta o Redis `prosa:lesson:v1:${hash}` e depois `lesson_cache` no Postgres, com `INSERT ... ON CONFLICT DO NOTHING`. O cabeçalho `x-prosa-cache` diz `hit` ou `miss`. Uma geração que perde a corrida espera o lock `prosa:lesson-lock:${hash}`, criado com `SET NX EX 45`. O TTL quente é `LESSON_CACHE_TTL_SECONDS`, 86400 por padrão.

Os âncoras de cognato não entram no blob. Eles são lidos na resposta.

## Cache do áudio neural

A chave é `prosa:neural:v1:${sha256(lang + voz + texto)}`. O valor é o MP3 e, ao lado, o JSON de palavras com `offset_ms`. O TTL acompanha o da lição. `GET /api/v1/audio/neural/:id` devolve `audio/mpeg`.

## Sessão

O registro grava Argon2id em `users.password_hash`. O login compara o hash. A sessão é 32 bytes aleatórios em base64url. O banco guarda o SHA-256. O cliente manda `Authorization: Bearer`. A sessão dura 30 dias.

`GET /api/v1/auth/me` devolve a conta, inclusive os interesses. O tipo `AuthUser` usado nas rotas não carrega interesses nem `cognate_lesson_count`; quem precisa lê a coluna na hora.

Se o pedido de geração traz `Authorization` e o token é inválido, a resposta é 401. Sem cabeçalho, a geração anônima segue as regras da edição grátis.

## Limites

Além do teto global de 120 por minuto:

| Rota | Por minuto |
| --- | --- |
| Registro e login | 8 |
| Quiz de interesses | 8 |
| Gerar lição | 10 |
| Lição personalizada | 10 |
| Notícia | 10 |
| Falar (`speak`) | 30 |
| GET do MP3 | 60 |
| Vozes | junto do speak |
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

## O que o Compose não recria à toa

Os volumes `prosa_postgres_data` e `prosa_redis_data` sobrevivem a `docker compose up -d --build`. Recriar a API ou o Edge-TTS com `--no-deps` evita derrubar o banco. `docker compose down -v` apaga os volumes. Não faz parte do fluxo normal.

A API e o Edge-TTS leem senhas só pelo `env_file`. O arquivo não é interpolado pelo Compose, então uma senha com `$` não é comida.

## Saúde

`GET /health` faz `SELECT 1` e `PING` no Redis. Se um falha, 503 com `status: unavailable` e o nome do esquema. Se os dois respondem, 200 com `status: ok` e `schema`, hoje `007_cognates`. O número muda quando uma migração nova passa a ser a versão declarada em `src/types/database.ts`.
