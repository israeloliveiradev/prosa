# Visão do produto

O Prosa cabe num intervalo de vinte minutos. A promessa não é um curso infinito: é uma prosa por dia, com leitura, memória, fala e escrita, sempre no idioma de estudo e explicada através do idioma de apoio.

## A sessão

`SESSION_SECONDS` no aplicativo marca os vinte minutos. O tempo escolhe a etapa:

| Etapa | Id | O que acontece |
| --- | --- | --- |
| Leitura | `reading` | A história, o áudio, o viva-voz, o toque na palavra e o duplo toque gramatical |
| Revisão | `review` | Cartas do vocabulário da lição, com SM-2 |
| Fala | `shadow` | Até quatro frases para repetir, com acurácia e cadência |
| Diário | `journal` | Um texto curto. No terceiro dia, a reconstrução entra antes |

O botão Continuar pula para o início da etapa seguinte e para o áudio. O relógio, ao cruzar a fronteira sozinho, também para a narração comum. A fila do viva-voz continua enquanto a pessoa não toca em Continuar, Encerrar ou sai da sessão.

No fim, com os vinte minutos completos, aparece o convite para o duelo.

## Planos

A edição grátis:

- uma lição por dia;
- um par de idiomas, incluindo um par como alemão através do inglês;
- o histórico local guarda essa lição do dia.

A Prosa Pro:

- histórico das lições anteriores;
- tema escrito pela pessoa naquele dia;
- mais de um par de estudo;
- geração personalizada a partir dos interesses.

Trocar de par sem ser Pro abre a tela de assinatura. Abrir uma lição antiga sem ser Pro faz o mesmo. O tema personalizado na edição grátis também leva ao paywall.

O plano mora em `users.plan` (`free` ou `pro`). O checkout usa Stripe quando `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` existem. Sem essas chaves a rota explica que a cobrança não está configurada. O aplicativo também tem um estado local `pro` para a interface; a fonte da conta é o banco.

## Idiomas e interesses

Alvos de estudo: `en`, `es`, `de`, `ru`, `fr`, `it`, `ja`.

Idiomas de apoio: os mesmos, mais `pt`.

Uma trilha é o par (`target_lang`, `through_lang`) em `study_tracks`. Os dois códigos precisam ser diferentes. Uma conta pode ter várias trilhas; uma delas fica `active`. A edição grátis permanece num único par.

Interesses são um `text[]` de no máximo doze itens, cada um entre 1 e 48 caracteres, validados por `fn_interests_valid`. Eles entram na história personalizada, na notícia, no duelo, no palácio e na escolha das cenas. Não são JSON.

## As dez peças

### 1. Palácio da memória

O servidor olha o histórico de revisões da carta. A lâmpada abre quando `repetition_count > 3`, já houve revisão e a taxa de falha passa de 60%. O modelo devolve uma associação sensorial na língua de apoio. O texto fica em `srs_mnemonics`, uma linha por carta. A imagem é opcional e pode ficar vazia.

### 2. Desconstrução gramatical

Na leitura, dois toques na mesma frase pedem `POST /api/v1/grammar/deconstruct`. A resposta tem exatamente quatro papéis, nesta ordem: `subject`, `connector`, `verb`, `object`. Se o modelo embaralhar, `orderGrammarBlocks` recoloca. Cada bloco traz o texto atual e alternativas. `POST /api/v1/grammar/vary` monta a frase nova e devolve o áudio para o aplicativo tocar.

### 3. Notícia

`POST /api/v1/news/fetch-adapted` lê um item de RSS, reescreve no nível pedido e devolve história, vocabulário, tradução e áudio. O cliente pede um índice de 0 a 2 e uma faixa CEFR (`A2`, `B1` ou `C1`). A chave local inclui interesse, índice e faixa. Uma notícia antiga sem vocabulário é tratada como incompleta e lida de novo.

"Estudar esta notícia" abre a sessão de vinte minutos com aquela história, sem uma segunda geração de lição. Se a edição grátis já tem outra lição hoje, a pessoa vai para o paywall.

### 4. Radar de cadência

A gravação vai para `POST /api/v1/audio/analyze-shadowing-phonetic`. O Gemini transcreve e devolve a duração de cada palavra. O Edge-TTS já guardou o offset de cada palavra da referência. `cadenceReport` compara as duas sequências.

- razão abaixo de 0,75: a pessoa apressou;
- razão acima de 1,35: a pessoa alongou;
- se um dos lados vier vazio, a nota cai no ritmo geral e as barras somem.

Não há decodificação da amplitude do MP3. Não há Whisper.

### 5. Reconstrução bidirecional

No dia 1, se a lição tem história e tradução, o aplicativo guarda uma âncora: data, tema, par, nível, texto e tradução. A âncora é independente do único item de histórico da edição grátis, para o dia 3 ainda existir.

A revisão vence quando a distância em dias é pelo menos 2 e `completedOn` está vazio. Nesse dia o diário mostra só a tradução. A pessoa escreve ou dita. Ditar transcreve; não compara antes do envio. `POST /api/v1/journal/reconstruct` devolve nota, erros gramaticais e calques ("tradução ao pé da letra"). A história original só aparece depois do envio.

Se já existe uma reconstrução pendente e chega uma lição nova, a pendente fica e a nova espera. Ao concluir, a que esperava sobe.

### 6. Duelo

`POST /api/v1/duel/round` pede doze lacunas ao modelo. O servidor embaralha as quatro opções para a correta não ficar sempre no índice zero. Cada acerto vale `10 * combo`. O teto de uma rodada é `5 * n * (n + 1)`.

`POST /api/v1/duel/score` grava `duel_runs`: usuário, idioma alvo, nível, pontos, melhor combo e acertos. O combo não pode passar do número de acertos.

`GET /api/v1/duel/leaderboard` lista a melhor pontuação de cada conta naquele `target_lang`. O rótulo é a parte local do e-mail, no máximo 24 caracteres. A pessoa atual aparece como "Você". Não há linhas inventadas.

### 7. Cognatos no A1

Um par entra no modo cognato quando o nível é A1, ainda não se usaram cinco lições desse modo e existem pelo menos oito cognatos verdadeiros. Para quem está logado, `users.cognate_lesson_count` sobe em toda geração cognata, inclusive quando a lição veio do cache, e para em 5. Para quem está anônimo, o corpo manda `cognate: true` enquanto a lista local tiver menos de cinco chaves `data:tema`.

A história é montada com cognatos verdadeiros, verbos frequentes e artigos ou pronomes. Falsos amigos são proibidos no texto e listados na leitura, com o sentido real. A lição cognata tem sufixo `:cognate` na chave de cache, para não reaproveitar uma lição A1 comum. Os âncoras vêm do banco na hora da resposta e não ficam dentro do blob cacheado.

A lição já aberta hoje permanece. A próxima lição A1 nova é que usa o modo.

### 8. Viva-voz

O botão fica na leitura. A fila é:

1. uma introdução na língua de apoio;
2. para cada frase, até dezesseis: ouvir, quatro segundos, ouvir de novo.

A confirmação reusa o mesmo MP3. O português de apoio usa `pt-BR-FranciscaNeural` por padrão, ou Antonio se a pessoa trocou a voz. Se a síntese falha, a tela mostra o erro. A fila não mistura a voz do sistema operacional.

Pausar congela também o silêncio. Próxima pula o silêncio e a confirmação da frase atual. No navegador, as teclas de mídia fazem play, pause e próxima faixa. No telefone, a tela bloqueada faz play e pause. A próxima faixa na tela bloqueada não tem gancho próprio no expo-audio; o botão Próxima fica na tela.

### 9. Mapa de retenção

Uma palavra cai numa faixa:

| Faixa | Quando |
| --- | --- |
| Em risco | venceu o prazo, ou ainda está em aprendizagem, ou o intervalo é 0 |
| Esquecendo | intervalo de 1 a 5 dias e não está em risco |
| Firmando | intervalo de 6 a 20 dias |
| Memória longa | intervalo acima de 21 dias e não venceu o prazo |

Uma palavra longa que já venceu o prazo conta como em risco, porque precisa de ativação agora. A nota do dia é a porcentagem em memória longa. Deck vazio vale 100, o padrão da coluna.

O aplicativo calcula o mapa do deck local, para a revisão relâmpago funcionar sem rede. Com a conta aberta, `POST /api/v1/srs/retention` grava `words_mastered`, `words_decaying` e `retention_score` daquele dia. O servidor recalcula a partir dos intervalos enviados; não aceita a nota pronta.

### 10. Cena

Cada idioma de estudo tem três cenas: entrevista com um fundador (formal, interesse técnico), estação (formal, viagem ou cultura) e café (informal). Sem esses interesses, ficam a estação e o café. Tecnologia sozinha não abre o café.

A primeira fala é fixa, no idioma de estudo, para a conversa começar sem uma chamada ao modelo. As falas seguintes passam por `POST /api/v1/persona/turn`. A resposta da persona fica no idioma de estudo. A dica cultural fica na língua de apoio. O tom é `adequate`, `direct`, `informal` ou `inadequate`.

Ditar usa a transcrição do Gemini. A voz da resposta é a narradora escolhida para aquele idioma.

## Elenco

Quatro figuras acompanham a sessão: Clara lê, Bento guarda, Nuno fala e Lia escreve. As fotos estão em `mobile/assets/cast/`. O progresso de cada uma na início reflete, respectivamente, a lição de hoje, a proporção de palavras dominadas, o selo de voz clara e o selo de diário.

## O que o produto não faz

Não há uma comunidade com pessoas fictícias no placar. Não há um quinto destino escondido: duelo e cena moram em Prática. O aplicativo não fala com o Gemini, com o Stripe nem com o Edge-TTS. A transcrição não usa Whisper. O áudio nativo não usa expo-av.
