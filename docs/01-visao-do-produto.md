# Visão do produto

O Prosa é uma sessão diária de vinte minutos para estudar um idioma através de outro. A pessoa lê uma história, revisa o vocabulário, fala em voz alta e escreve um diário curto. Não é um curso infinito: é uma prosa por dia, no idioma de estudo, explicada pelo idioma de apoio.

O aplicativo nunca chama Gemini, Stripe nem Edge-TTS. Tudo passa pela API Fastify.

O repositório público é [israeloliveiradev/prosa](https://github.com/israeloliveiradev/prosa).

## A sessão

`SESSION_SECONDS` no aplicativo marca os vinte minutos. O relógio escolhe a etapa:

| Etapa | Id | Quem ensina (padrão) | O que acontece |
| --- | --- | --- | --- |
| Leitura | `reading` | Einstein | História, áudio neural, viva-voz, toque na palavra, duplo toque gramatical |
| Revisão | `review` | Curie | Cartas do vocabulário da lição, SM-2, palácio da memória quando a carta sofre |
| Fala | `shadow` | Feynman | Até quatro frases para repetir, com acurácia e cadência |
| Diário | `journal` | da Vinci | Texto curto. No terceiro dia, a reconstrução entra antes |

Cada etapa tem quatro mentes famosas. A pessoa troca o elenco na conta. A personalidade entra no prompt da lição e na chave de cache (`:m:`), então Einstein e Platão não devolvem a mesma história.

O botão Continuar pula para o início da etapa seguinte e para o áudio. O relógio, ao cruzar a fronteira sozinho, também para a narração comum. A fila do viva-voz continua enquanto a pessoa não toca em Continuar, Encerrar ou sai da sessão.

No fim, com os vinte minutos completos, aparece o convite para o duelo.

## Planos

A edição grátis:

- uma lição por dia;
- um par de idiomas, inclusive um par como alemão através do inglês;
- o histórico local guarda essa lição do dia.

A Prosa Pro:

- histórico das lições anteriores;
- tema escrito pela pessoa naquele dia;
- mais de um par de estudo;
- geração personalizada a partir dos interesses.

Trocar de par sem ser Pro abre a assinatura. Abrir uma lição antiga sem ser Pro faz o mesmo. O tema personalizado na edição grátis também leva ao paywall.

O plano mora em `users.plan` (`free` ou `pro`). O checkout usa Stripe quando `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` existem. Sem essas chaves a rota explica que a cobrança não está configurada. Confirmar o pagamento exige a mesma conta que abriu o checkout. O aplicativo também tem um estado local `pro` para a interface; a fonte da conta é o banco.

## Idiomas e interesses

Alvos de estudo: `en`, `es`, `de`, `ru`, `fr`, `it`, `ja`.

Idiomas de apoio: os mesmos, mais `pt`. Português não é alvo.

Uma trilha é o par (`target_lang`, `through_lang`) em `study_tracks`. Os dois códigos precisam ser diferentes. Uma conta pode ter várias trilhas; uma delas fica `active`. A edição grátis permanece num único par.

Interesses são um `text[]` de no máximo doze itens, cada um entre 1 e 48 caracteres, validados por `fn_interests_valid`. Eles entram na história personalizada, na notícia, no duelo, no palácio e na escolha das cenas. Não são JSON.

## Conta

Criar conta pede e-mail, senha (8 a 72 caracteres) e o par inicial. A API só emite sessão depois que o código de seis dígitos do e-mail entra. Sem SMTP, Resend ou Brevo configurados, o registro responde 503: a produção não auto-confirma a caixa.

Há também:

- troca de senha (as outras sessões caem);
- troca de e-mail com código na caixa nova;
- 2FA por TOTP (RFC 6238) e/ou código por e-mail, com códigos de recuperação;
- redefinição de senha por código de seis dígitos, TTL 15 minutos;
- lembrete diário opcional na hora escolhida.

A interface da conta e das cartas usa Newsreader nos títulos e Source Sans 3 no corpo. O tema é terracota e creme no claro (`#9A3412` / `#FFF8F1`) e o par correspondente no escuro.

## Elenco

São dezesseis figuras históricas em bonecos de vinil originais, nunca mascotes de casa. Cada uma ocupa um único papel pedagógico:

| Papel | Mentes |
| --- | --- |
| Leitura | Einstein, Platão, Newton, Galileu |
| Memória | Curie, Aristóteles, Lovelace, Darwin |
| Fala | Feynman, Sócrates, Tesla, Cícero |
| Diário | da Vinci, Confúcio, Hipátia, Marco Aurélio |

O padrão da conta nova é Einstein, Curie, Feynman e da Vinci.

## As dez peças

### 1. Palácio da memória

O servidor olha o histórico de revisões da carta. A lâmpada abre quando `repetition_count > 3`, já houve revisão e a taxa de falha passa de 60%. O modelo devolve uma associação sensorial na língua de apoio. O texto fica em `srs_mnemonics`, uma linha por carta. A imagem é opcional e pode ficar vazia.

### 2. Desconstrução gramatical

Na leitura, dois toques na mesma frase pedem `POST /api/v1/grammar/deconstruct`. A resposta tem exatamente quatro papéis, nesta ordem: `subject`, `connector`, `verb`, `object`. Se o modelo embaralhar, `orderGrammarBlocks` recoloca. Cada bloco traz o texto atual e alternativas. `POST /api/v1/grammar/vary` monta a frase nova e devolve o áudio para o aplicativo tocar.

### 3. Notícia

`POST /api/v1/news/fetch-adapted` lê um item de RSS de hosts HTTPS conhecidos, reescreve no nível pedido e devolve história, vocabulário, tradução e áudio. O cliente pede um índice de 0 a 2 e uma faixa CEFR (`A2`, `B1` ou `C1`). A chave local inclui interesse, índice e faixa. Uma notícia antiga sem vocabulário é tratada como incompleta e lida de novo.

"Estudar esta notícia" abre a sessão de vinte minutos com aquela história, sem uma segunda geração de lição. Se a edição grátis já tem outra lição hoje, a pessoa vai para o paywall.

### 4. Radar de cadência

A gravação vai para `POST /api/v1/audio/analyze-shadowing-phonetic`. O Gemini transcreve e devolve a duração de cada palavra. O Edge-TTS já guardou o offset de cada palavra da referência. `cadenceReport` compara as duas sequências.

- razão abaixo de 0,75: a pessoa apressou;
- razão acima de 1,35: a pessoa alongou;
- se um dos lados vier vazio, a nota cai no ritmo geral e as barras somem.

Não há decodificação da amplitude do MP3. Não há Whisper.

### 5. Reconstrução bidirecional

No dia 1, se a lição tem história e tradução, o aplicativo guarda uma âncora: data, tema, par, nível, texto e tradução. A âncora é independente do único item de histórico da edição grátis, para o dia 3 ainda existir.

A revisão vence quando a distância em dias é pelo menos 2 e `completedOn` está vazio. Nesse dia o diário mostra só a tradução. A pessoa escreve ou dita. Ditar transcreve; não compara antes do envio. `POST /api/v1/journal/reconstruct` devolve nota, erros gramaticais e calques. A história original só aparece depois do envio.

### 6. Duelo

Cento e vinte segundos, quatro segundos por lacuna, quatro opções, combo de dez pontos vezes a sequência. O placar lista contas reais daquele idioma de estudo. Não há ranking fictício nem comunidade inventada.

### 7. Cognatos no A1

As cinco primeiras lições A1 de uma conta usam cognatos verdadeiros e verbos frequentes. Falsos amigos aparecem na leitura, não na história.

### 8. Viva-voz

A leitura pode tocar sem a tela: cenário na língua de apoio, frase, quatro segundos de silêncio e a mesma frase de novo. A voz é neural. O sintetizador do aparelho não entra nesse caminho.

### 9. Mapa de retenção

Cada célula reúne até quatro palavras. Em risco, esquecendo, firmando ou memória longa (intervalo acima de 21 dias). A célula em risco abre a revisão só dessas palavras. A conta grava o dia em `user_retention_logs`.

### 10. Cena

Uma persona fala no idioma de estudo, no registro da situação. A dica cultural volta na língua de apoio e classifica o tom: serviu, direto demais, informal demais ou fora do costume.

## Administração

Uma conta cujo e-mail está em `ADMIN_EMAILS` ganha `role = admin` no login. O painel em `/admin` mostra contas, planos, eventos de operação e o interruptor da geração. Quem não é admin recebe 403.

## O que o produto não é

Não há feed social, ranking inventado, segundo modelo de linguagem, mascote de casa, chamada direta do cliente a provedores pagos, nem auto-confirmação de e-mail em produção.
