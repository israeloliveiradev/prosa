# Banco de dados

PostgreSQL 16. A versão declarada no código é `015_verify`, em `DATABASE_SCHEMA_VERSION`. As migrações são aditivas. A primeira cria o núcleo. As outras não reescrevem a base.

## Ordem

O volume novo executa sozinho, via `docker-entrypoint-initdb.d`:

1. `migrations/001_init_prosa_enterprise.sql`

Ela exige servidor 16 ou mais novo, cria `uuid-ossp` e as tabelas de conta, carta, lição, vocabulário e a função `fn_execute_sm2_review`.

As seguintes entram depois, na ordem do número, com `psql` e `ON_ERROR_STOP`:

| Arquivo | O que acrescenta |
| --- | --- |
| `001_init_prosa_v4.sql` | `users.interests text[]`, `fn_interests_valid`, ajustes da função SM-2 já existente |
| `002_srs_sync_events.sql` | Idempotência das revisões vindas do aparelho |
| `003_auth_sessions.sql` | `users.plan` e `auth_sessions` |
| `004_study_tracks.sql` | Pares de idioma |
| `005_memory_palace.sql` | `srs_mnemonics` e `user_retention_logs` |
| `006_duel.sql` | `duel_runs` |
| `007_cognates.sql` | `cognate_pairs` e `users.cognate_lesson_count` |
| `008_admin_role.sql` | `users.role` (`learner` ou `admin`) |
| `009_ops.sql` | `app_settings` (pausa da geração) e `ops_events` |
| `010_account.sql` | nome de exibição, locale, lembrete, colunas de conta |
| `011_security.sql` | TOTP, e-mail 2FA, `user_recovery_codes` |
| `012_minds.sql` | `mind_reading`, `mind_memory`, `mind_speech`, `mind_journal` |
| `013_vinyl.sql` | troca o elenco antigo pelo vinil; os CHECKs saem antes do UPDATE |
| `014_famous.sql` | as quatro casas passam a figuras históricas (Galileu, Darwin, Cícero, Aurélio) |
| `015_verify.sql` | `users.email_verified_at`; contas já existentes recebem a data de criação |

Um volume que já passou pela 001 não roda a 001 de novo. Aplicar 002–015 outra vez precisa ser seguro: elas usam `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` ou `ON CONFLICT DO NOTHING` onde o arquivo foi escrito assim. Leia o arquivo antes de repetir uma função `CREATE OR REPLACE`. Não rode de novo a 001 enterprise num volume povoado.

Exemplo, com as variáveis do container e sem imprimir a senha:

```bash
docker exec -i prosa-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < migrations/015_verify.sql
```

Repita para cada arquivo que ainda não entrou. Não use `down -v` para "recomeçar" um banco que já tem conta.

A saúde da API mostra o esquema que o código declara, não uma tabela `schema_migrations`.

## Conta

`users` guarda e-mail, `password_hash` Argon2id, `native_lang`, `target_lang`, `level` CEFR, sequência, congelamentos, plano, `role` (`learner` ou `admin`), interesses, `cognate_lesson_count` de 0 a 5, nome, locale (`pt` ou `en`), lembrete, elenco das quatro mentes, flags de 2FA e `email_verified_at`.

O e-mail listado em `ADMIN_EMAILS` ganha `admin` no login. A senha nunca volta na API.

`email_verified_at` nulo impede sessão. A 015 preenche as contas que já existiam com `COALESCE(created_at, now())` para ninguém ficar trancado.

`auth_sessions` guarda o hash SHA-256 do token, o usuário e `expires_at`. Trinta dias a partir da emissão. Logout apaga a linha daquele token. Troca de senha, reset e troca de e-mail apagam as outras sessões da conta.

`study_tracks` é única por (`user_id`, `target_lang`, `through_lang`). Os códigos permitidos estão no `CHECK`. Alvo e apoio não podem ser iguais.

`user_recovery_codes` guarda o SHA-256 de oito códigos de um uso, emitidos quando o TOTP é confirmado.

## Elenco

As quatro colunas `mind_*` aceitam só os ids daquele papel:

- leitura: `einstein`, `plato`, `newton`, `galileo`
- memória: `curie`, `aristotle`, `lovelace`, `darwin`
- fala: `feynman`, `socrates`, `tesla`, `cicero`
- diário: `davinci`, `confucius`, `hypatia`, `aurelius`

O padrão é Einstein, Curie, Feynman e da Vinci.

## Cartas e SM-2

`srs_cards` tem frente, tradução, frase de contexto, repetições, `interval_days`, `ease_factor` entre 1,30 e 9,99, status `learning` | `reviewing` | `mastered` e `next_review_at`.

`fn_execute_sm2_review(uuid, smallint)` aceita qualidade de 0 a 5. O aplicativo manda 0, 3, 4 ou 5.

- qualidade abaixo de 3 zera as repetições e marca o intervalo curto;
- a facilidade anda com a fórmula SM-2 e fica presa entre 1,30 e 9,99;
- intervalo de 21 dias ou mais é o limiar de dominada no cliente;
- o teto de intervalo é 36500 dias.

Cada chamada grava também a linha de auditoria com facilidade e intervalo anteriores e novos.

`srs_sync_events` tem `client_id` como chave primária, no formato `[A-Za-z0-9_-]{8,80}`. Reenviar o mesmo id não aplica o SM-2 de novo. A qualidade aceita no banco desse evento é 0, 3, 4 ou 5.

`srs_mnemonics` é única por `card_id`. `association_text` não pode ser vazio. `image_url` pode ser nula.

## Lições e cache

`daily_lessons` liga a conta à data. `lesson_cache` guarda o JSON da lição pela chave descrita na arquitetura, com conflito ignorado quando duas gerações chegam juntas. A chave inclui o elenco.

## Retenção

`user_retention_logs` tem `id` como chave primária e `UNIQUE (user_id, log_date)`.

Colunas: `words_mastered`, `words_decaying`, `retention_score` de 0 a 100. O índice é (`user_id`, `log_date` descendente).

O `POST /api/v1/srs/retention` faz `INSERT ... ON CONFLICT (user_id, log_date) DO UPDATE`.

## Duelo

`duel_runs` guarda usuário, idioma alvo, nível, `score` de 0 a 20000, `best_combo` de 0 a 40, `correct_count` de 0 a 40, com `best_combo <= correct_count`. O índice do placar é (`target_lang`, `user_id`, `score` descendente). A consulta usa `DISTINCT ON (user_id)` para ficar a melhor nota.

## Cognatos

`cognate_pairs` é única por apoio, alvo, palavra alvo e tipo (`true` ou `false`). O gloss explica o sentido, e no falso amigo explica o sentido real. A 007 insere as linhas com `ON CONFLICT DO NOTHING`.

Há pares de português para cada alvo, de inglês para os outros alvos, e de alemão, espanhol, francês e italiano para o inglês. Cada um desses pares semeados tem pelo menos oito cognatos verdadeiros, que é o mínimo para abrir o modo A1, além dos falsos amigos.

## Operação

`app_settings` guarda a pausa da geração. `ops_events` registra Gemini, lição, áudio, notícia e plano, para o painel admin.

## Redis (não é tabela, mas é estado)

| Chave | TTL | Conteúdo |
| --- | --- | --- |
| `prosa:lesson:v1:${hash}` | 86400 | JSON da lição quente |
| `prosa:lesson-lock:${hash}` | 45 | trava de geração |
| `prosa:neural:v1:${sha256}` | 86400 | MP3 |
| `prosa-rl:` | 60 | limite de taxa |
| `prosa:verify:${sha256(email)}` | 900 | código de confirmação da conta |
| `prosa:reset:${sha256(email)}` | 900 | código de senha |
| `prosa:otp:${purpose}:${userId}` | 300 | OTP de e-mail (hash) |
| `prosa:2fa:${sha256(ticket)}` | 300 | id da conta no desafio 2FA |
| `prosa:totp-setup:${userId}` | 600 | segredo TOTP ainda não confirmado |
| `prosa:email:${userId}` | 900 | e-mail novo pendente |
| `prosa:lock:${scope}:${sha256}` | 900 | contador de falhas |
| `prosa:once:register:${sha256}` | 8 | clique duplo no registro |
| `prosa:once:checkout:${userId}` | 20 | clique duplo no checkout |

## O que não mudou de propósito

`users.interests` continua `text[]`. Não há migração que o converta para JSONB. Apagar tabelas ou reescrever a 001 em cima de um volume povoado não faz parte do desenho.
