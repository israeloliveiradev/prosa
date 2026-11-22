# Trilha híbrida: contrato (M2)

A trilha tem um esqueleto fixo por nível CEFR e conteúdo gerado pela IA. A próxima unidade só abre por domínio.

## Peças

| Peça | Arquivo | Conteúdo |
|---|---|---|
| Esqueleto | `src/curriculum/units.ts` | 32 unidades funcionais (A1 8, A2 8, B1 8, B2 5, C1 3), iguais para todos os idiomas. Ids `a1-01` … `c1-03`, que nunca mudam |
| Silabo | `src/curriculum/syllabus.ts` | Título e 2–3 metas "eu consigo…" por unidade, nos 7 idiomas de interface |
| Idioma-alvo | `src/curriculum/<lang>.ts` (en, es, de, fr, it, ja, ru) | Por unidade: foco gramatical (nome no idioma-alvo, resumo em inglês, 2 exemplos) e 10–15 lemas-núcleo |
| Tipos e validação | `src/curriculum/types.ts`, `validate.ts`, `check.ts` | `npx tsx src/curriculum/check.ts en syllabus` |

Cada lema-núcleo pertence a uma só unidade do idioma, porque é ele que mede o domínio.

## Estados de uma unidade

| Estado | Quando |
|---|---|
| `validated` | Fica abaixo do nível medido pelo nivelamento; conta como concluída |
| `active` | É a unidade atual (exatamente uma por curso) |
| `mastered` | O domínio foi atingido |
| `locked` | Fica depois da atual |

Uma unidade `mastered` ou `validated` nunca volta a `locked`.

## Domínio da unidade

Todos os critérios são calculados no servidor:

1. **Lições:** pelo menos 3 sessões concluídas com essa unidade (`POST /api/v1/sessions/complete` com `unit_id`).
2. **Lemas:** pelo menos 80% dos lemas-núcleo com um cartão FSRS de estabilidade ≥ 3 dias, para o mesmo usuário e idioma.
   - O cartão casa com o lema quando o `front_phrase` normalizado é igual ao lema ou o contém como palavra inteira.
   - Em ja, basta conter o lema.
3. **Diário:** um diário dessa unidade com a escada de correção fechada, comprovado por dado do servidor (journal), não por flag do cliente.
4. **Teste da unidade:** pelo menos 70% em 8 itens gerados a partir dos lemas e da gramática da unidade.
   - As respostas certas ficam só no servidor.
   - O teste só abre quando os critérios 1–3 estão cumpridos.

Ao dominar a unidade, ela vira `mastered` e a seguinte vira `active`. No fim de uma banda, se todas as unidades dela estiverem `mastered` ou `validated`, abre o checkpoint da banda: itens do banco de nivelamento daquela faixa. Passar no checkpoint sobe `users.level`.

## Ponto de partida

O caminho é criado sob demanda no primeiro `GET /path` de cada (usuário, idioma-alvo), a partir de `users.level`:

- as bandas abaixo do nível ficam `validated`;
- a primeira unidade da banda do nível fica `active`;
- o resto fica `locked`.

Quando o nivelamento termina com um nível maior, as bandas abaixo dele passam a `validated` e a unidade ativa avança. Unidades dominadas não são desfeitas.

## API

Todas as rotas exigem `Authorization: Bearer <token>`.

### `GET /api/v1/path?locale=pt`

`locale` escolhe o idioma de título e metas; o padrão é o `display_locale` da conta, com fallback para `en`.

```json
{
  "target_lang": "en",
  "level": "A1",
  "current_unit_id": "a1-01",
  "units": [
    {
      "id": "a1-01",
      "band": "A1",
      "order": 1,
      "status": "active",
      "title": "Olá, prazer",
      "can_do": ["Consigo me apresentar…", "…"],
      "focus": ["speaking", "listening"],
      "grammar": { "name": "Present Simple: be", "examples": ["I am Ana.", "Where are you from?"] },
      "mastery": {
        "lessons": { "done": 1, "required": 3, "met": false },
        "lemmas": { "known": 4, "total": 12, "required": 10, "met": false },
        "journal": { "met": false },
        "test": { "best": null, "required": 70, "available": false, "met": false }
      },
      "unlocked_at": "2026-11-20T10:00:00.000Z",
      "completed_at": null
    }
  ],
  "checkpoint": { "band": "A1", "available": false, "passed": false }
}
```

Em unidades `locked`, `mastery` pode vir com zeros. Os campos estão sempre presentes.

### `POST /api/v1/sessions/complete`

Registra uma sessão diária concluída: a ofensiva no servidor e o progresso da unidade.

```json
{ "date": "2026-11-20", "unit_id": "a1-01", "elapsed_seconds": 1180 }
```

Resposta: `{ "streak_count": 3, "unit": <unidade como em GET /path> | null }`. É idempotente por (usuário, idioma, data): repetir não conta duas vezes.

### `POST /api/v1/path/units/:id/test/start`

Retorna 409 se a unidade não estiver `active` ou os critérios 1–3 não estiverem cumpridos.

```json
{ "attempt_id": "uuid", "items": [ { "id": "q1", "skill": "grammar", "prompt": "…", "options": ["…", "…", "…", "…"] } ] }
```

São 8 itens, cada um com 4 opções.

### `POST /api/v1/path/units/:id/test/finish`

```json
{ "attempt_id": "uuid", "answers": [ { "item_id": "q1", "choice": 2 } ] }
```

Resposta:

```json
{ "score": 75, "passed": true, "correct": 6, "total": 8, "unit": { }, "next_unit_id": "a1-02" }
```

Aqui, `unit` é a unidade atualizada.

### Checkpoint da banda

- `POST /api/v1/path/checkpoint/start` devolve `{ attempt_id, band, items }`.
- `POST /api/v1/path/checkpoint/finish` recebe `{ attempt_id, answers }` e devolve `{ score, passed, level }`.

### Lição da unidade

`POST /api/v1/lessons/generate` e `POST /api/v1/lessons/generate-personalized` aceitam `unit_id` opcional. Com ele, o prompt passa a incluir:

- o tópico da unidade e as metas (em inglês);
- a gramática (resumo e exemplos);
- os lemas-núcleo, que devem aparecer no texto e no vocabulário com `front_phrase` igual ao lema;
- os temas do aluno, o objetivo, as habilidades fracas e os tipos de erro (`learner_profile`) e alguns fatos da `learner_memory`.

A chave de cache inclui `unit_id`.

## Persistência

- **`migrations/031_learning_path.sql`:**
  - `path_progress (user_id, target_lang, unit_id, status, lessons_done, unlocked_at, completed_at, updated_at, PK (user_id, target_lang, unit_id))`;
  - `path_unit_tests` (tentativas e gabarito);
  - `session_completions (user_id, target_lang, date, unit_id, elapsed_seconds, UNIQUE (user_id, target_lang, date))`.
- **`migrations/032_account_prefs.sql`:** `users.goal`, `users.goal_note`, `users.daily_minutes` (10/20/30) e `display_locale` com os 7 idiomas.

## Glosas no idioma de apoio

As glosas do currículo (`src/curriculum/<lang>.ts`) estão em inglês. O aluno só as vê no teste de unidade (itens de significado do teste determinístico); a rodada-chefe e as lições só enviam lemas, em idioma-alvo, à IA. Regra: glosa visível ao aluno é no idioma de apoio (`users.native_lang`). `src/services/gloss-translation.ts` devolve as glosas da unidade: inglês como está; outro idioma por uma chamada de IA em lote (validada: mesma contagem, sem vazio, sem o próprio lema), em cache no Redis por `gloss:v1:<alvo>:<unidade>:<apoio>` por 90 dias, com chamadas simultâneas deduplicadas. Sem tradução, o teste usa só lacunas e nunca glosa em inglês (se faltar item, o início responde 503 "não pronto").
