# Leitura, conversa, práticas e Você: contrato do backend (M3)

Este documento registra cada endpoint que mudou no M3, com o formato final exato. Os campos novos são aditivos: nenhum campo antigo saiu, exceto onde está escrito.

Migração nova: `migrations/033_duel_unit_best.sql` (aditiva e idempotente). `GET /health` passa a responder `schema: "033_duel_unit_best"`.

## 1. Notícia adaptada

`POST /api/v1/news/fetch-adapted` (Bearer)

Corpo (sem mudança):

```ts
{ interest?: string /* 1..80 */, voice?: string, index?: 0 | 1 | 2, level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" }
```

Resposta 200 (cabeçalho `x-prosa-cache: hit | miss`):

```ts
{
  title: string;
  story_text: string;
  translation: string;
  vocabulary: Array<{ word: string; translation: string; example_sentence: string }>;
  journal_prompt: string;
  source_url: string;            // https; URL do editor quando o corpo foi lido, senão o link do feed
  source_title: string;          // manchete original do feed
  source_name: string | null;    // NOVO: editor ("BBC", "The Washington Post"…), do <source> do RSS ou do host
  source_depth: "full" | "summary"; // NOVO
  published: string | null;
  audio_url: string | null;
  words: Array<{ text: string; offset_ms: number }>;
}
```

### Profundidade da fonte

- **`"full"`:** o servidor leu o corpo da matéria e o mandou para a IA com a regra "use só fatos presentes na fonte". O texto tem de 90 a 140 palavras.
- **`"summary"`:** só a manchete e o resumo do RSS estavam disponíveis. O texto é mais curto (40 a 80 palavras) e não acrescenta fatos, nomes, números, causas nem citações.
- Entradas antigas do cache, sem o campo, saem como `"summary"`, porque foram geradas só da manchete.

### Regras da leitura do corpo (`src/services/news-article.ts`)

| Regra | Valor |
|---|---|
| Protocolo | Só `https`, sem usuário/senha nem porta na URL |
| Editores permitidos (o host pode ser um subdomínio) | `bbc.co.uk`, `bbc.com`, `tagesschau.de`, `ansa.it`, `nhk.or.jp`, `theverge.com`: os mesmos dos feeds de reserva |
| Links do Google News | Só valem quando o id antigo (`CBMi…`) traz em base64 uma URL de um editor da lista. O servidor nunca chama o Google para resolver o link; no formato atual, a matéria sai como `"summary"` |
| Redirecionamento | Seguido à mão (no máximo 3), e só para outro host da lista |
| Tempo | 6 s no total |
| Tamanho | No máximo 600 KB lidos; só `text/html` |
| Extração | Remove `script`, `style`, `noscript`, `nav`, `header`, `footer`, `aside`, `form`, `figure`, `svg`, `iframe` e outros blocos; junta só o texto de `<p>` (dentro de `<article>` quando houver); descarta parágrafos curtos, repetidos e de rodapé; corta em ~4000 caracteres num fim de parágrafo |
| Corpo mínimo | 280 caracteres (120 em texto japonês); abaixo disso a matéria sai como `"summary"` |

### Checagem do idioma de saída (`src/services/news-language.ts`)

Antes de entrar no cache, o título e o `story_text` precisam estar no idioma-alvo:

| Idioma | Regra |
|---|---|
| ja | Tem kana; kana + kanji ≥ 60% das letras; kana ≥ 10% (chinês não passa) |
| ru | Cirílico ≥ 70% das letras |
| en, es, de, fr, it | ≥ 80% de letras latinas; proporção de palavras funcionais do idioma ≥ 8% e não menor que a de outro idioma latino. As listas só têm palavras exclusivas de um idioma |

- Se falhar, o servidor tenta de novo uma vez, avisando a IA do idioma.
- Se falhar de novo, responde **502 `"News adaptation failed"`** (mensagem pública) e não grava no cache.
- Uma entrada do cache no idioma errado é ignorada e refeita; o fallback "matéria recente" também pula essas entradas.

### Outros erros (sem mudança)

- 503 `"Lesson generation is paused"`.
- 502 quando o feed cai e não há matéria recente no cache. A mensagem pública continua `"Internal server error"`.

## 2. Pré-carga diária das notícias

`src/services/news-preload.ts`, chamada no tick de 15 min de `src/app.ts`.

- Fica **desligada**, a menos que a variável de ambiente `NEWS_PRELOAD_ENABLED=true` esteja definida (`src/config.ts`).
- **Alunos:** quem tem `users.last_lesson_at` nos últimos 7 dias ou uma `session_completions` com `date >= current_date - 7`.
- **Grupos:** `(target_lang, native_lang, level, interests[1])`, no máximo 30 por tick, ordenados pelo número de alunos.
- **Ordem:** primeiro a matéria 0 de todos os grupos, depois a 1, depois a 2.
- **Teto:** no máximo 20 gerações de IA por tick. O que já está no cache é pulado e não conta.
- **Grupo pronto:** com as 3 matérias no cache, o grupo é marcado no Redis (`prosa:news-preload:done:<dia UTC>:…`, 36 h) e não volta naquele dia.
- **Trava:** `prosa:news-preload:lock` (10 min) evita duas instâncias ao mesmo tempo. A pré-carga também não roda com a geração pausada (`ops`).

## 3. Cenas de conversa

`GET /api/v1/persona/scenes?target_lang=xx` (Bearer)

- `target_lang` é opcional, e o padrão é o `target_lang` da conta. Fora de en/es/de/fr/it/ja/ru (por exemplo `pt`), a resposta é 400.

Resposta 200:

```ts
{
  scenes: [Scene, Scene, Scene]; // sempre 3, nesta ordem: kind "goal", "unit", "interest"
  source: "ai" | "fallback";
}

type Scene = {
  id: string;            // /^[a-z0-9-]{3,64}$/ — "ai-<kind>-AAAAMMDD" ou "fb-goal-<goal>", "fb-unit-<unit_id>", "fb-interest-<slug>"
  kind: "goal" | "unit" | "interest";
  title: string;         // ≤ 80
  setting: string;       // ≤ 220
  learner_role: string;  // ≤ 100
  partner_role: string;  // ≤ 100
  objective: string;     // ≤ 220
  twist: string | null;  // ≤ 220; sempre null nas cenas fixas
  unit_id: string | null; // só na cena "unit": a unidade ativa da trilha nesse idioma
};
```

- **Idioma dos textos:** `title`, `setting`, `learner_role`, `partner_role`, `objective` e `twist` vêm no idioma de interface da conta (`users.display_locale`, com fallback `en`). O parceiro fala o idioma-alvo.
- **Cena `goal`:** vem de `users.goal` e `goal_note`.
- **Cena `unit`:** vem da unidade `active` em `path_progress`. Sem trilha ainda, usa a 1ª unidade da banda do nível.
- **Cena `interest`:** vem de `users.interests[0]`.
- **IA:** gera as 3 cenas. O cache fica no Redis por (usuário, idioma-alvo, idioma de interface, dia UTC): 36 h para cenas da IA, 10 min para cenas fixas (a próxima visita tenta a IA de novo).
- **Fallback:** quando a IA falha, saem cenas fixas por tipo de objetivo (`career | travel | studies | culture | family | relocation`; sem objetivo, `travel`), nos 7 idiomas de interface:
  - a cena `unit` usa o título e a 1ª meta "eu consigo…" da unidade, do silabo;
  - a cena `interest` usa o rótulo traduzido dos temas conhecidos ou o texto do próprio aluno.

`POST /api/v1/persona/turn` (Bearer)

Corpo:

```ts
{
  scene?: Scene;          // NOVO: a cena do GET acima; o parceiro faz partner_role nesse setting rumo ao objective
  scene_id?: string;      // cena fixa antiga (persona-scenes.ts); obrigatório só sem `scene`
  target_lang?: "en" | "es" | "de" | "ru" | "fr" | "it" | "ja"; // NOVO, opcional: idioma do parceiro (padrão: o da conta)
  user_line: string;      // 1..500
  history: Array<{ role: "persona" | "learner"; text: string /* 1..500 */ }>; // ≤ 12
}
```

- Sem `scene` e sem `scene_id`, a resposta é 400.
- Com `scene`, o `twist` (quando não é null) é a complicação que o parceiro sustenta.

Resposta 200:

```ts
{ reply: string; tone: "adequate" | "direct" | "informal" | "inadequate"; cultural_note: string; register: "formal" | "informal" | null }
```

- `register` é `null` no modo cena: o parceiro escolhe o registro que combina com o cenário.

## 4. Ritmo honesto na pronúncia

`POST /api/v1/audio/analyze-shadowing` e `POST /api/v1/audio/analyze-shadowing-phonetic` ganham:

```ts
rhythm_measured: boolean
```

- **`/analyze-shadowing`:** sempre `false`, porque essa rota não avalia ritmo.
- **`/analyze-shadowing-phonetic`:**
  - `true` quando o Gemini transcreveu e mediu o ritmo;
  - `false` quando a transcrição veio do fallback (Groq/Whisper), que não mede ritmo. Nesse caso `pitch_rhythm_match = 0`, `cadence_match = 0` e `bars = []`. Antes, o fallback inventava 70.
- Silêncio ou fala não reconhecida continua com tudo em 0. Acerto abaixo de 30 (`MIN_ACCURACY_FOR_RHYTHM`) também zera ritmo e cadência.
- O app mostra "ritmo não medido" quando `rhythm_measured` é `false` e não paga XP de ritmo.
- A nota de ritmo do contrato é `pitch_rhythm_match`. A cadência é `cadence_match`.

## 5. Ofensiva calculada na leitura

A ofensiva vem de `session_completions` (migração 031), em todos os cursos da conta.

- `streak_count`: dias seguidos que terminam na sessão mais recente. Vale **0** se essa sessão é mais antiga que ontem (UTC).
- `last_session_date`: `"AAAA-MM-DD"` da sessão mais recente, ou `null`.

Onde aparece:

| Rota | Mudança |
|---|---|
| `GET /api/v1/auth/me` | `user.streak_count` passa a ser calculado, não mais lido de `users.streak_count`; `user.last_session_date` é novo. Os outros campos não mudam |
| `user` devolvido com o `token` (login por senha, verificação por código e 2FA) | Ganha `streak_count` e `last_session_date`, além de `id, email, native_lang, target_lang, level, plan, role, display_locale` |
| `POST /api/v1/sessions/complete` | Sem mudança: já devolve `streak_count` |

## 6. Assinatura (paywall honesto)

`GET /api/v1/billing/status` (sem autenticação):

```ts
{ configured: boolean; checkout_available: boolean; reason: "not_configured" | null }
```

- `checkout_available` só é `true` com `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` definidos e não vazios. Nesse caso, `reason` é `null`.

`POST /api/v1/billing/checkout` (Bearer):

| Situação | Resposta |
|---|---|
| Sem login | 401 |
| Stripe não configurado | **503 `{ "error": "Payments are not configured" }`** (mensagem pública). A checagem vem antes da validação do corpo |
| Configurado | `{ url }` do Stripe |

`GET /api/v1/billing/sessions/:id` responde o mesmo 503 sem Stripe. O plano só vira `pro` depois de uma sessão do Stripe paga, conferida no servidor e da própria conta. Nada concede Pro de graça.

## 7. Duelo da unidade e recorde pessoal

`POST /api/v1/duel/round` (Bearer)

Corpo (opcional):

```ts
{ unit_id?: string /* /^(a1|a2|b1|b2|c1)-[0-9]{2}$/ */ }
```

Resposta 200:

```ts
{
  drills: Array<{ prompt: string /* com "____" */; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3 }>; // 8..12
  focus: string[];        // tipos de erro do aluno usados na rodada
  unit_id: string | null; // NOVO: eco do pedido (null = modo livre)
  best: number | null;    // NOVO: recorde pessoal do aluno nesse idioma-alvo e nessa unidade (ou no modo livre); null sem rodada salva
}
```

Com `unit_id`, a rodada é a rodada-chefe da unidade:

- O prompt leva o tópico da unidade, a gramática (`nome: resumo`) e até 10 lemas-núcleo de `src/curriculum`. Os lemas que o aluno ainda não fixou vêm primeiro.
- Pelo menos metade dos drills precisa usar a gramática ou um lema. Os outros miram os tipos de erro do aluno.
- Os drills que usam um lema da unidade vêm primeiro.

Erros:

| Status | Mensagem | Quando |
|---|---|---|
| 400 | `Invalid request` | `unit_id` fora do formato |
| 404 | `Unit not found` | A unidade não existe |
| 409 | `This unit is locked` | A unidade está bloqueada na trilha. Sem linha em `path_progress`, vale o estado inicial do nível do aluno |
| 502 | — | A IA falhou na validação. A mensagem pública continua `"Internal server error"`, sem mudança |

`POST /api/v1/duel/score` (Bearer)

Corpo:

```ts
{ score: number; best_combo: number; correct_count: number; unit_id?: string /* NOVO: a unidade da rodada-chefe */ }
```

Resposta:

```ts
{ saved: true; best: number } // NOVO: best = recorde pessoal depois desta rodada, para a mesma unidade ou modo livre
```

`GET /api/v1/duel/leaderboard`: o placar passa a contar só o modo livre (`unit_id IS NULL`). As rodadas-chefe ficam fora.

A migração 033 adiciona `duel_runs.unit_id text NULL` (checagem do formato) e o índice `idx_duel_runs_best (user_id, target_lang, unit_id, score DESC)`. Ela já foi aplicada no Postgres compartilhado.
