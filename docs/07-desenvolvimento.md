# Desenvolvimento

## Pré-requisitos

- Node.js 22 ou mais novo, para a API e para o Expo
- Docker, para Postgres 16, Redis 7, a API, o Edge-TTS e o Mailpit
- npm

O aplicativo usa o Expo SDK indicado em `mobile/package.json`.

## Ambiente

```bash
cp secrets/runtime.env.example secrets/runtime.env
```

Preencha as senhas e `GEMINI_API_KEY`. `GEMINI_MODEL` pode ficar no exemplo ou apontar para o modelo da conta Google. `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` podem ficar vazios até existir um preço. `ADMIN_EMAILS` é a lista, separada por vírgula, dos e-mails que entram em `/admin`. `CORS_ORIGINS` é opcional: origens extras do app web, além de `APP_PUBLIC_URL` e `localhost:8081`.

O Compose local já define `SMTP_HOST=mailpit` e `MAIL_INBOX_URL=http://localhost:8025`. Sem um desses canais de correio, o registro responde 503.

O arquivo real está no `.gitignore` (`secrets/*.env`, `.env`, `.env.*`). Não o commite. A imagem Docker também não o copia (`.dockerignore`).

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

Não derrube uma stack Docker de outro projeto (por exemplo oee) que compartilhe a máquina.

Confira:

```bash
curl -sS http://127.0.0.1:3000/health
curl -sS http://127.0.0.1:8077/health
```

A saúde da API, com o esquema atual, parece `{"status":"ok","schema":"015_verify"}`.

Cartas locais: `http://localhost:8025`.

## Migrações depois da primeira

Se o volume acabou de nascer, a 001 enterprise já rodou. Aplique o restante na ordem numérica, como em [Banco de dados](03-banco-de-dados.md), até `015_verify.sql`. Um banco que já está em `015_verify` não precisa delas de novo. A saúde mostra o esquema que o código declara, não um `schema_migrations` separado.

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

Os testes cobrem distância de edição, chave de cache, esquemas Zod, notícia, vozes, palácio, gramática, cadência, reconstrução, duelo, cognatos, viva-voz, retenção, cenas, TOTP, cartas, mentes e as regras de segurança (CORS, URL de retorno, SMTP, LIKE, hosts de RSS, vazamento de erro). Eles não chamam o Gemini nem o banco.

`npm audit --omit=dev` na raiz, depois desta auditoria, reportou zero vulnerabilidades nas dependências de produção.

## Aplicativo

```bash
cd mobile
npm install
npx expo start --web --port 8081
```

Se a porta estiver ocupada por um Metro antigo, encerre o processo que escuta em 8081 e suba de novo. Com `CI=1`, o Metro não recarrega sozinho.

A URL da API é `EXPO_PUBLIC_API_URL`. Sem ela, o cliente usa `http://127.0.0.1:3000`.

```bash
cd mobile
npx tsc --noEmit
```

## Onde mexer

| Mudança | Lugar |
| --- | --- |
| Rota HTTP | `src/routes/` e o esquema em `src/schemas/` |
| Autenticação | `src/auth/`, `src/routes/auth.ts`, `src/routes/account.ts` |
| Allowlist, lockout, SMTP | `src/security/` |
| Prompt da lição / mentes | `src/services/minds.ts` e `mobile/src/design/minds.ts` |
| Carta de e-mail | `src/services/mail-templates.ts` |
| Voz neural | `src/services/neural-voice.ts`, `services/edge-tts/` |
| Tela | `mobile/src/app/` e `mobile/src/components/` |
| Tema e tipo | `mobile/src/design/tokens.ts`, `mobile/src/global.css`, `mobile/tailwind.config.js` |
| Migração | `migrations/NNN_nome.sql` e `DATABASE_SCHEMA_VERSION` |
| Contrato de produto | `docs/01-visao-do-produto.md` |

## Publicar

O remoto é `https://github.com/israeloliveiradev/prosa.git`, ramo `main`. Senhas e chaves não entram no commit. Um `force-push` em `main` não faz parte do fluxo.

Antes de produção, leia [Segurança](08-seguranca.md): as ações manuais (SMTP real, `APP_PUBLIC_URL`, `CORS_ORIGINS`, `ADMIN_EMAILS`, chaves Stripe) ficam lá.
