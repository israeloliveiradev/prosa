# Desenvolvimento

## Pré-requisitos

- Node.js 22 ou mais novo, para a API e para o Expo
- Docker, para Postgres 16, Redis 7, a API e o Edge-TTS
- npm

O aplicativo usa o Expo SDK indicado em `mobile/package.json`.

## Ambiente

```bash
cp secrets/runtime.env.example secrets/runtime.env
```

Preencha as senhas e `GEMINI_API_KEY`. `GEMINI_MODEL` pode ficar no exemplo ou apontar para o modelo que você tiver na conta Google. `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` podem ficar vazios até existir um preço.

O arquivo real está no `.gitignore` (`secrets/*.env`). Não o commite.

## Stack

```bash
docker compose up -d --build
```

Para reconstruir só a API, sem recrear o banco e o Redis:

```bash
docker compose up -d --build --no-deps api
```

Quando o catálogo de vozes do Python muda, reconstrua os dois:

```bash
docker compose up -d --build --no-deps edge-tts api
```

Não use `docker compose down -v` num volume que já tem conta. Esse comando apaga `prosa_postgres_data` e `prosa_redis_data`.

Confira:

```bash
curl -sS http://127.0.0.1:3000/health
curl -sS http://127.0.0.1:8077/health
```

## Migrações depois da primeira

Se o volume acabou de nascer, a 001 enterprise já rodou. Aplique o restante na ordem numérica, como em [Banco de dados](03-banco-de-dados.md). Um banco que já está em `007_cognates` não precisa delas de novo. A saúde mostra o esquema que o código declara, não um `schema_migrations` separado.

## API fora do Docker

```bash
npm install
npm run dev
```

`dev` usa `tsx --env-file=secrets/runtime.env`. Nesse modo, `POSTGRES_HOST` e `REDIS_HOST` precisam alcançar as portas publicadas: `127.0.0.1` e as portas 5433 e 6380. O Compose, lá dentro, aponta para os nomes `postgres` e `redis`.

```bash
npm test
npm run build
```

## Aplicativo

```bash
cd mobile
npm install
npx expo start --web --port 8081
```

Se a porta estiver ocupada por um Metro antigo, encerre o processo que escuta em 8081 e suba de novo. Com `CI=1`, o Metro não recarrega sozinho.

A URL da API é `EXPO_PUBLIC_API_URL`. Sem ela, o cliente usa `http://127.0.0.1:3000`.

## Onde mexer

| Mudança | Lugar |
| --- | --- |
| Rota nova | `src/routes`, registro em `src/app.ts`, esquema Zod em `src/schemas` |
| Prompt do modelo | `src/services/gemini-gateway.ts`, sempre com JSON e Zod |
| Chave de cache | `src/services/cache-key.ts` e o teste correspondente |
| Voz nova | `services/edge-tts/app.py`, `src/services/voice-catalog.ts`, `mobile/src/lib/narrator.ts` |
| Tabela nova | próximo arquivo em `migrations/`, e `DATABASE_SCHEMA_VERSION` se a saúde deve anunciá-la |
| Tela nova | `mobile/src/app`, e o tipo gerado do Expo Router se o `tsc` do app exigir a rota |
| Regra pura | função sem rede e um arquivo em `test/` |

Uma rota nova entra no limite do Redis. O teto global continua 120 por minuto.

## Testes que existem

`npm test` executa, nesta ordem: Levenshtein, chave de cache, esquemas, notícia, vozes, palácio, gramática, cadência, reconstrução, duelo, cognato, viva-voz, retenção e cenas.

Eles importam TypeScript direto com `tsx`. Não sobem Postgres. Uma regra nova de pontuação, faixa ou escolha de cena deve ganhar um caso aqui antes de depender só da tela.

## Publicar a imagem

O `Dockerfile` da raiz compila a API com `npm run build` e sobe `node dist/server.js`. O contexto ignora `secrets`, `test` e markdown. A imagem não leva `runtime.env`; o Compose injeta o `env_file` na hora de criar o container.

O `Dockerfile` em `services/edge-tts` instala o `requirements.txt` e copia `app.py`.

## Skill de interface

`.agents/skills/ui-ux-pro-max` é a cópia local da skill de interface usada ao desenhar telas. Ela não roda em produção. A paleta do produto, em `mobile/src/design/tokens.ts`, prevalece sobre uma sugestão genérica da skill.
