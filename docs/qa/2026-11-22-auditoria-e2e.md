# Auditoria E2E — Prosa (M5)

**Data:** 22/11/2026 · **Branch:** `feat/aprender-de-verdade`

## Resumo

A auditoria rodou o app de verdade contra o backend de verdade, com banco, IA e voz reais:
- o build de produção servido em `:8081`;
- a API no Docker;
- a IA real (Gemini, com reserva no OpenRouter);
- as vozes neurais baixadas no navegador.

Nenhuma resposta da API foi simulada. A única exceção são os testes que conferem o aviso de "IA fora do ar", e eles estão comentados no código.

| | Resultado |
|---|---|
| Blocos | **14 de 14** verdes |
| Testes | **75 de 75** em 1440, 1024 e 390 px. A última rodada completa (22 min) deu 73 de 75; as 2 falhas eram a varredura de layout em 1440 e 390, por causa do 502 da Leitura (seção 3). Depois da correção, o bloco 14 rodou de novo nas 3 larguras: 6 de 6. |
| Erros de console ou respostas ≥ 400 não declaradas | **0**: o guarda da base falha o teste em qualquer um |
| Defeitos encontrados e corrigidos | **17**: 1 crítico, 10 maiores, 6 menores, mais 1 de segurança (seção 3) |
| Suíte antiga com API simulada (`npm run e2e`) | de 58 falhas para **82 de 82** |
| Verificação adversarial | 1 afirmação refutada e corrigida; 6 testes reforçados; 4 pontos fracos documentados (seção 5) |

## 1. Como rodar

```bash
# backend no Docker, com o override da auditoria: e-mail só no Mailpit e limite de requisições maior
docker compose -f docker-compose.yml -f docker-compose.audit.yml up -d --build api
cd mobile
npm run audit:build      # build estático apontado para a API :3000
npm run audit:serve      # serve em :8081 (o CORS da API só aceita essa porta)
npm run e2e:audit        # 14 blocos, 1 worker; relatório em playwright-report/audit
```

O `docker-compose.audit.yml` zera `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `RESEND_API_KEY` e `BREVO_API_KEY`, e sobe `RATE_LIMIT_GLOBAL_MAX` para 1500. Sem ele, a base se recusa a criar contas (veja a seção 6). Depois da auditoria, volte ao normal com `docker compose up -d --build api`.

## 2. Os 14 blocos

Em cada bloco, a asserção confere o efeito no servidor (pela API ou pelo SQL) ou depois de recarregar a página, e não só o que aparece na tela.

| # | Bloco | O que ficou provado | Arquivo |
|---|---|---|---|
| 1 | Conta, onboarding, F5 | Cadastro pela tela com o código do Mailpit, onboarding completo até Hoje. O servidor grava objetivo, temas, minutos e nível. F5 mantém sessão e jornada; sair e entrar funciona; senha errada mostra erro traduzido. | `01-account.spec.ts` |
| 2 | 7 cursos e isolamento | en, es, de, fr, it, ja e ru com bandeira e nome certos. Trocar de curso pelo seletor funciona. Cartões e lições de um curso não aparecem em outro. | `02-courses.spec.ts` |
| 3 | Idioma de tela ×7 e de apoio | Nos 7 idiomas, navegação e títulos iguais às tabelas de texto. A escolha é gravada na conta, sobrevive ao F5, e o idioma da conta vence o do aparelho. Quem tem espanhol como apoio vê traduções em espanhol. | `03-languages.spec.ts` |
| 4 | Voz no navegador | Taxa de amostragem do cabeçalho WAV: Kokoro 24 kHz; Piper 22,05 ou 16 kHz conforme o catálogo. `playbackRate` 1 e `preservesPitch`; repetir a frase vem do cache (< 50 ms, sem sintetizar de novo); vozes diferentes geram áudios diferentes; japonês vai só ao Web Speech `ja-JP`. | `04-voice.spec.ts` |
| 5 | Trilha linear | Conta nova: a1-01 ativa, a1-02 travada na tela e na API. Com os critérios cumpridos, o teste da unidade feito na tela reprova com 0% (nada libera) e aprova com 100% (a1-01 dominada, a1-02 ativa). Nivelamento em B1 começa mais adiante. Nenhuma definição em inglês para quem tem apoio em português. | `05-path.spec.ts` |
| 6 | Sessão diária completa | Todas as etapas pela tela (revisão, escuta, leitura, fala com voz gravada, diário corrigido pela IA, nota). O servidor registra a sessão uma vez, mesmo repetindo, com XP uma vez, cartões da lição em `/srs/cards` e ofensiva 1. A lição é da unidade ativa e dos temas do aluno. | `06-daily.spec.ts` |
| 7 | Pronúncia | Silêncio dá nota 0, "nenhuma fala detectada", nenhuma chamada de análise e nenhum XP. Tom puro não ganha nota inventada (nada de 70 fixo). Fala real gera a nota do servidor. Na sessão, o silêncio libera "pular a fala". | `07-pronunciation.spec.ts` |
| 8 | Mentor e cenas | O mentor abre e responde em inglês e lembra de um fato depois de recarregar (`/prose/memory`). As 3 cenas (objetivo, unidade, tema) começam com a fala do personagem (`opener`), sem mostrar a reviravolta, e a resposta vem no papel, com o retorno de tom. Sem a API, aparece o aviso "Conversa offline". | `08-talk.spec.ts` |
| 9 | Revisão e Palácio | Um aparelho novo mostra os cartões do servidor, com os filtros nas contagens certas. A rodada altera estabilidade e vencimento no servidor e paga 1 XP por cartão uma vez. O mnemônico da IA é gravado em `srs_mnemonics`. | `09-review.spec.ts` |
| 10 | Oficina gramatical | A frase vira 4 blocos com opções. Trocar um bloco faz a IA remontar a frase. Entrada curta mostra o erro traduzido sem chamar a IA. Visual tátil. | `10-workshop.spec.ts` |
| 11 | Duelo | Rodada da unidade (8 a 12 perguntas, metade ou mais com lemas da unidade). O placar da tela bate com `duel_runs` e o recorde é anunciado e gravado. O duelo livre também funciona, e o cartão em Práticas mostra o recorde. | `11-duel.spec.ts` |
| 12 | Leitura | Matéria real no tema e no nível, com o selo "texto completo" ou "resumo" igual ao da API. Tocar a palavra mostra a definição no idioma de apoio. **Guardar a palavra cria o cartão no servidor.** Ditado e "Seu texto" funcionam e persistem. | `12-reading.spec.ts` |
| 13 | Você, Ajustes, temas, assinatura | Trocar temas e objetivo grava na conta, e Leitura e Cenas passam a usar os temas novos. Minutos, lembrete, idioma e velocidade persistem. A assinatura é honesta: sem Stripe, ninguém vira Pro, nem forjando `?checkout=success`. | `13-you.spec.ts` |
| 14 | Dossiê e layout | Publicar gera `/dossier/<token>`, que abre sem login, com as medidas, imprime e invalida o link antigo ao republicar. Token inválido mostra "não encontrado" traduzido. Na varredura de 23 rotas em 1440, 1024 e 390 px: sem rolagem lateral, sem texto cortado e sem erro. | `14-dossier-layout.spec.ts` |

## 3. Defeitos encontrados e corrigidos

| Gravidade | Defeito | Causa | Correção |
|---|---|---|---|
| **Crítico** | Trocar de curso dava **500** quase sempre a partir do 3º curso | `UPDATE study_tracks SET active = (target_lang = $2)` muda duas linhas numa instrução, e o índice único parcial "um curso ativo" é conferido linha a linha | Duas instruções na mesma transação (`src/services/personalization-service.ts`) |
| Maior | O onboarding abria em inglês/português e podia **trocar a conta de alemão para inglês** | A jornada nascia com o par padrão en/pt em vez do par do cadastro | A jornada nova recebe o par da conta (`mobile/src/lib/journey.ts`, `first-day.ts`, `start-screen.tsx`) |
| Maior | Depois de trocar de curso, a Revisão não buscava os cartões do novo curso (até 60 s ou F5) | A chave da consulta não tinha o idioma | Idioma na chave (`use-server-deck.ts`) |
| Maior | Microfone mudo **prendia** o aluno na etapa de fala | "Pular a fala" só aparecia em erro de microfone, não em gravação silenciosa | Gravação sem voz também libera o pulo, ainda sem XP (`daily.tsx`) |
| Maior | A rodada da Revisão **não pagava XP** | `enqueueReview` não paga XP, e só a sessão diária chamava `awardXp` | `awardXp("card", …)` na Revisão e no mapa de retenção |
| Maior | A variação da Oficina dava **502** | O modelo devolve o conector vazio quando o tempo vai para o verbo ("sells"), e o schema exigia texto | Conector vazio aceito; repõe o marcador da desmontagem; prompt ajustado |
| Maior | A variação da Oficina dava **502** quando a voz do servidor (edge-tts) caía | O áudio era obrigatório na resposta | Sem a voz do servidor, a frase vem sem áudio e o app lê com a voz do aparelho (`grammar-service.ts`) |
| Maior | Palavra guardada na Leitura ou na sessão **nunca chegava ao servidor** (perdida ao trocar de aparelho) | O cartão só nascia no servidor na primeira revisão | Novo `POST /api/v1/srs/cards`, idempotente pelo índice único, chamado ao guardar |
| Maior | Diário podia ficar "Lendo sua resposta…" para sempre | Chamada sem tempo-limite | Tempo-limite de 75 s, com erro traduzido e opção de tentar de novo |
| Menor | O cartão do Duelo em Práticas não mostrava o recorde novo | Consulta em cache (60 s) nunca invalidada | Invalida `duel-board` ao salvar |
| Menor | O Dossiê público mostrava A1 para um aluno B1 | `view()` não usava o nível da conta como reserva | Mesma reserva que `mine()` usa |
| Menor | Seletores (temas, nível, idioma, opções de teste e nivelamento) sem `aria-checked`: só a cor indicava a escolha | O react-native-web não converte `accessibilityState.checked` | `aria-checked` em 10 componentes |
| Menor | A cena mostrava a reviravolta antes de começar | Decisão do M3 | Ela fica só com o personagem, que a revela com naturalidade |
| Maior | A Leitura dava **502** para quem tem apoio em português em matérias corretas | A trava anti-espanhol tratava todo "ía" final como espanhol e recusava imperfeitos do português ("construía", "incluía", "saía") duas vezes seguidas | "ía" só conta depois de consoante (tecnología, economía, día), no backend e no app (`through-lang.ts`), com testes |
| Maior | A cena de interesse ignorava o tema principal do aluno | O prompt pedia "um dos temas"; o contrato diz `interests[0]` | O prompt manda só o tema principal (achado do verificador) |
| Menor | O registro das cenas da IA vinha formal ("Sie") | O prompt não dizia o tratamento | Registro do app no prompt (du/tú/tu, vous, です/ます) |
| Menor | O personagem anunciava a reviravolta como fato geral | Prompt | "Revela com naturalidade, nunca como anúncio" |
| **Segurança** | A API **gravava no log o código de verificação** junto com o e-mail, em qualquer ambiente | `console.log` de depuração em `email-verify.ts` | Removido; em desenvolvimento, o código aparece no Mailpit |

## 4. Suíte antiga (`npm run e2e`, API simulada)

Antes: 108 testes, com 58 falhas e 48 aprovados. Depois: 82 aprovados e 2 ignorados de propósito, num total de 84.
- **Atualizados:** 14 arquivos (seletores, textos e rotas do redesenho). O mock `routes.mjs` tinha um handler duplicado de `/placement/status` e campos que o app agora exige.
- **Apagados:** 4 arquivos que testavam o que saiu de propósito ou que a auditoria real já cobre:
  - `ui/gallery`: galeria só de desenvolvimento;
  - `home/cast` e `home/free-vs-pro`: telas antigas;
  - `onboarding/journey`: coberto pelo bloco 1 com backend real.

## 5. Verificação adversarial

Um verificador independente, que não escreveu os testes, tentou derrubar cada bloco perguntando: "este teste passaria se a função fosse falsa ou estivesse quebrada?".

**Refutado (e corrigido):**
- **Bloco 13 — cenas usam o tema principal.** O contrato (`docs/13-m3-contrato.md`) diz que a cena de interesse vem de `users.interests[0]`. O prompt da IA pedia "um dos temas", e com Cozinha e astronomia ela montou uma cena de astronomia. Durante a integração, eu tinha afrouxado o teste com base numa leitura errada do contrato. O verificador restaurou a asserção estrita, e o prompt agora manda só o tema principal (`gemini-gateway.ts`).

**Testes que passavam sem provar o que diziam (reforçados):**

| Bloco | Furo | Reforço |
|---|---|---|
| 1 | "Entrar de novo vai direto a Hoje" vinha da marca local da jornada, não do servidor | Login num navegador limpo; a jornada tem de vir do servidor (objetivo, minutos, idioma, temas) |
| 3 | Comparava a tela com as tabelas do próprio app (uma tabela copiada do português passaria); a regex de "espanhol" aceitava português | Cada idioma tem de diferir do português, e o japonês tem de usar escrita japonesa; marcadores só do espanhol |
| 6 | Aceitava pular a fala; a conferência do XP depois do F5 engolia erros | A fala tem de ser avaliada; o F5 espera a tela remontar; salvar de novo não paga nem duplica |
| 8 | `if (source === "fallback")` pulava as conferências da fala de abertura | Exige cenas da IA, todas com abertura |
| 12 | Não provava que o cartão era criado pelo toque | O cartão não pode existir antes de "Guardar"; a tradução não pode ter palavras em inglês |
| 14 | A varredura considerava `/` e `/path` prontos pelo menu (que aparece na hora), antes do conteúdo | Espera o conteúdo de cada tela e passa a incluir `/quiz`, `/placement`, `/unit-test` e `/checkpoint` |

**Fracos, documentados (sem correção nesta entrega):**
- **Bloco 2:** a conferência de "XP por curso" é sempre verdadeira, e o teste não ganha XP.
- **Bloco 5:** com a IA saudável, os 8 itens do teste da unidade vêm da IA (lacunas), e o teste da definição no idioma de apoio não encontra itens de significado. A tradução foi verificada à parte: com a IA real (alemão→português deu "olá / obrigado / irmão"), em testes unitários (`test/gloss-translation.test.ts`) e numa rodada anterior em que os itens apareceram com "nome" e "amigo".
- **Bloco 11:** o placar esperado é calculado com a própria função do app. O servidor grava o placar que o app manda (só com teto) e `/duel/round` entrega o gabarito ao app, então o ranking confia no cliente.
- **A base:**
  - o guarda só observa a página principal;
  - os blocos 8 e 12 liberam falhas de `/audio`;
  - `assertLayout` só mede o transbordo lateral.
- **Sem teste:** o checkpoint de fim de banda (início, fim e subida de nível).

## 6. Incidente durante a auditoria: e-mails reais pelo Mailjet

**O que aconteceu**
- A API do Docker usa o Mailjet sempre que as chaves estão em `secrets/runtime.env`, e o Mailpit só recebe uma cópia.
- A base da auditoria cria contas reais. Na primeira rodada (cerca de 200 contas `audit-…@prosa.test`), cada cadastro mandou um e-mail de verdade pela conta Mailjet do projeto.
- O domínio `.test` não existe, então todos voltaram. No fim, o Mailjet passou a recusar os envios (provavelmente por cota), e o cadastro passou a responder 503.

**O que foi feito**
- A base agora **se recusa a criar contas** se a API tiver Mailjet, Resend ou Brevo configurado (`assertLocalMailOnly` em `e2e/audit/fixtures.ts`).
- A auditoria roda com um override que zera essas variáveis.

**A fazer**
- Conferir no painel do Mailjet a cota, as rejeições e a reputação do remetente.
- Considerar um ambiente local sem chaves reais por padrão.

## 7. Pendências e limitações

- **Chave do Groq inválida** (401) no container: as chamadas baratas caem direto no Gemini, que bate cota com frequência. Vale renovar a chave.
- **Voz do servidor (edge-tts)** falhou durante a rodada. Agora a Oficina segue sem ela, mas outros pontos que usam a voz do servidor merecem a mesma tolerância.
- **Dossiê:** adicionar um ponto de acompanhamento a um dossiê nunca publicado cria o link público sem o aluno apertar "Publicar". É uma decisão de produto.
- **Japonês:** usa a voz do sistema. Sem voz ja-JP instalada, o app avisa com honestidade; o caminho foi verificado com uma voz simulada.
- **Inglês em máquina sem GPU:** o Kokoro é lento (2 s para 1 s de fala), e o app troca sozinho para a voz rápida (Piper), como previsto.
- **IA lenta:** a correção do diário levou de 2 a 22 s, e uma vez mais de 90 s (agora com tempo-limite).
- **Não automatizável:** se a voz soa bem, o gênero das vozes e a pronúncia. Veja o [roteiro de escuta](2026-11-22-roteiro-de-escuta.md).
- **Nivelamento e teste da unidade** são estimativas adaptativas, não um exame CEFR certificado.
