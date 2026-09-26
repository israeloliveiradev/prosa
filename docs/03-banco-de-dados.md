# Banco de dados

PostgreSQL 16. A versão declarada no código é `007_cognates`, em `DATABASE_SCHEMA_VERSION`. As migrações são aditivas. A primeira cria o núcleo. As outras não reescrevem a base.

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

Um volume que já passou pela 001 não roda a 001 de novo. Aplicar 002–007 outra vez precisa ser seguro: elas usam `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` ou `ON CONFLICT DO NOTHING` onde o arquivo foi escrito assim. Leia o arquivo antes de repetir uma função `CREATE OR REPLACE`.

Exemplo, com as variáveis do container e sem imprimir a senha:

```bash
docker exec -i prosa-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < migrations/002_srs_sync_events.sql
```

Repita para cada arquivo que ainda não entrou. Não use `down -v` para "recomeçar" um banco que já tem conta.

## Conta

`users` guarda e-mail, `password_hash` Argon2id, `native_lang`, `target_lang`, `level` CEFR, sequência, congelamentos, plano, interesses e `cognate_lesson_count` de 0 a 5.

O e-mail é único na prática do registro. A senha nunca volta na API.

`auth_sessions` guarda o hash SHA-256 do token, o usuário e `expires_at`. Trinta dias a partir da emissão. Logout apaga a linha.

`study_tracks` é única por (`user_id`, `target_lang`, `through_lang`). Os códigos permitidos estão no `CHECK`. Alvo e apoio não podem ser iguais.

## Cartas e SM-2

`srs_cards` tem frente, tradução, frase de contexto, repetições, `interval_days`, `ease_factor` entre 1,30 e 9,99, status `learning` | `reviewing` | `mastered` e `next_review_at`.

`fn_execute_sm2_review(uuid, smallint)` aceita qualidade de 0 a 5. O aplicativo manda 0, 3, 4 ou 5.

- qualidade abaixo de 3 zera as repetições e marca o intervalo curto;
- a facilidade anda com a fórmula SM-2 e fica presa entre 1,30 e 9,99;
- intervalo de 21 dias ou mais é o limiar de dominada no cliente (`status` passa a `mastered` quando o intervalo calculado chega aí);
- o teto de intervalo é 36500 dias.

Cada chamada grava também a linha de auditoria com facilidade e intervalo anteriores e novos.

`srs_sync_events` tem `client_id` como chave primária, no formato `[A-Za-z0-9_-]{8,80}`. Reenviar o mesmo id não aplica o SM-2 de novo. A qualidade aceita no banco desse evento é 0, 3, 4 ou 5.

`srs_mnemonics` é única por `card_id`. `association_text` não pode ser vazio. `image_url` pode ser nula.

## Lições e cache

`daily_lessons` liga a conta à data. `lesson_cache` guarda o JSON da lição pela chave descrita na arquitetura, com conflito ignorado quando duas gerações chegam juntas.

## Retenção

`user_retention_logs` tem `id` como chave primária e `UNIQUE (user_id, log_date)`. O desenho antigo com duas cláusulas `PRIMARY KEY` não é o que está aplicado.

Colunas: `words_mastered`, `words_decaying`, `retention_score` de 0 a 100. O índice é (`user_id`, `log_date` descendente).

O `POST /api/v1/srs/retention` faz `INSERT ... ON CONFLICT (user_id, log_date) DO UPDATE`.

## Duelo

`duel_runs` guarda usuário, idioma alvo, nível, `score` de 0 a 20000, `best_combo` de 0 a 40, `correct_count` de 0 a 40, com `best_combo <= correct_count`. O índice do placar é (`target_lang`, `user_id`, `score` descendente). A consulta usa `DISTINCT ON (user_id)` para ficar a melhor nota.

## Cognatos

`cognate_pairs` é única por apoio, alvo, palavra alvo e tipo (`true` ou `false`). O gloss explica o sentido, e no falso amigo explica o sentido real. A 007 insere as linhas com `ON CONFLICT DO NOTHING`.

Há pares de português para cada alvo, de inglês para os outros alvos, e de alemão, espanhol, francês e italiano para o inglês. Cada um desses pares semeados tem pelo menos oito cognatos verdadeiros, que é o mínimo para abrir o modo A1, além dos falsos amigos.

Exemplos de falsos amigos que a interface pode mostrar: em português-inglês, `actual`, `parents`, `pretend`; em português-espanhol, `embarazada`, `oficina`; em inglês-alemão, `Gift` como veneno. A lista completa está no `INSERT` da migração.

## O que não mudou de propósito

`users.interests` continua `text[]`. Não há migração que o converta para JSONB. Apagar tabelas ou reescrever a 001 em cima de um volume povoado não faz parte do desenho.
