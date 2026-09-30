# Visão do produto

O Prosa é uma sessão diária de **vinte minutos** para estudar um idioma **através de outro**. Não é um curso infinito: é uma prosa por dia, no idioma de estudo, explicada pelo idioma de apoio (o *through*). Português brasileiro é through, nunca alvo.

O aplicativo nunca chama Gemini, Stripe nem Edge-TTS. Tudo passa pela API Fastify.

O repositório público é [israeloliveiradev/prosa](https://github.com/israeloliveiradev/prosa).

## Como o dia se encaixa

```text
conta  →  /start (história → par → interesses → nivelamento → prosa)
      ↓
início  →  prosa de 20 min  →  memória / notícia / prática
      ↓
a cada 3º dia: reconstrução e, no calendário, fluência 4/3/2
      ↓
quando quiser: pares, ownlife, exame, score, dossiê, org
```

1. Cria a conta e confirma o e-mail. Sem placement neste idioma, a Prosa abre `/start`.
2. O primeiro dia é um fio: vinte minutos, o par, os interesses, o teste adaptativo, depois a prosa. O can-do descreve o que você já segura; **não muda** o nível.
3. O botão terracota do Início abre `/daily`. Se já começou hoje, continua.
4. O relógio divide os vinte minutos sozinho. Continuar pula a etapa e para o áudio.
5. Notícia, duelo, cena e prosa viva **não substituem** a lição do dia. Servem para alongar o mesmo idioma.

## A sessão de vinte minutos

`SESSION_SECONDS` é 1200. O relógio monta as fases pelo tamanho da fila FSRS e pelo ouvido:

| Etapa | Id | Quem ensina (padrão) | O que acontece |
| --- | --- | --- | --- |
| Revisão | `review` | Curie | Cartas devidas + vocabulário da lição, FSRS, palácio se a carta sofre |
| Ouvir | `listen` | — | Escolha pelo ouvido, ritmo 0,75 / 1 / 1,15 |
| Leitura | `reading` | Einstein | História, voz neural, viva-voz, toque na palavra, duplo toque gramatical |
| Fala | `shadow` | Feynman | Repetir frases: acurácia e cadência |
| Diário | `journal` | da Vinci | Texto curto. Escada: prompt → dica → correção. Só fecha quando a escada fecha |
| Nota | `note` | — | Fecho curto do dia |

Se o ouvido está fraco, o relógio **tira tempo da leitura e dá para ouvir**. Se não há carta devida, a revisão encolhe e a leitura cresce.

**Reconstrução** (não é o diário comum): no dia 1 a tradução fica guardada. Dois dias depois a pessoa reescreve a história só a partir da tradução. A história original só aparece depois do envio.

**Fluência 4/3/2**: em todo dia de calendário cujo número % 3 === 0, a fala vira três voltas que encolhem. A primeira tentativa do diário falado pode nascer carta de reparo.

Cada papel tem quatro mentes. O padrão é Einstein, Curie, Feynman e da Vinci. A personalidade entra no prompt e na chave de cache (`:m:`).

No fim dos vinte minutos completos aparece o convite para o duelo.

## Como aproveitar o máximo

Faça **uma prosa completa por dia civil**, no mesmo par. O streak, o FSRS e a reconstrução do terceiro dia dependem disso. Pular a escada do diário ou sair no meio não conta o dia.

Estude **através do português** se for o seu L1. Toda glosa e toda tradução devem nascer em português brasileiro. Se aparecer *ción / sión / ía*, a carta é lixo: o filtro descarta; não decore.

No quiz, liste interesses de verdade (trabalho, café, cinema). Eles alimentam a história, a notícia, o duelo, o palácio e a cena.

No placement, responda sem chute apressado. Depois marque o can-do do que já sai na vida. Isso muda o perfil, não a faixa CEFR.

Na leitura: um toque guarda a palavra com a frase; dois toques na mesma frase abrem sujeito / tempo / verbo / objeto. As sublinhadas já estão na revisão de hoje.

Na revisão: note com honestidade. FSRS alonga o intervalo só quando o “bom” é bom de verdade.

Na fala: use viva-voz quando puder falar alto. Troque a voz embaixo da história. O ritmo 0,75 ajuda no começo.

No diário: reescreva até a correção aparecer. A primeira tentativa é a que gera carta de reparo; as seguintes só ensinam.

Notícia: “estudar esta matéria” **é** a prosa do dia. Na edição grátis, se já houve outra lição hoje, vai para o paywall.

Score e certificado: não apresse item. Se metade for corrida, o certificado público some.

Pares: escreva no idioma que o outro estuda. Brasileiro com through PT entra na fila mesmo sem estudar português.

Ownlife: cole um texto seu (mensagem, e-mail), sem URL. A reescrita fica no seu nível.

Org: uma empresa, um setor (tech, saúde, vendas). O léxico do trabalho entra no due. Sem ranking.

Dossiê: gere o token e imprima. Não manda e-mail.

Pro: histórico, tema escrito no dia, mais de um idioma. Grátis: um par e a lição de hoje.

## Planos

A edição grátis:

- uma lição por dia;
- um par de idiomas, inclusive alemão através do inglês;
- o histórico local guarda essa lição do dia.

A Prosa Pro:

- histórico das lições anteriores;
- tema escrito pela pessoa naquele dia;
- mais de um par de estudo;
- geração personalizada a partir dos interesses.

Trocar de par sem ser Pro abre a assinatura. Abrir uma lição antiga sem ser Pro faz o mesmo. O tema personalizado na edição grátis também leva ao paywall.

O plano mora em `users.plan` (`free` ou `pro`). O checkout usa Stripe quando as chaves existem. Confirmar o pagamento exige a mesma conta que abriu o checkout.

## Idiomas e interesses

Alvos de estudo: `en`, `es`, `de`, `ru`, `fr`, `it`, `ja`.

Idiomas de apoio: os mesmos, mais `pt`. Português não é alvo. Estudar um idioma através dele mesmo é recusado.

Uma trilha é o par (`target_lang`, `through_lang`) em `study_tracks`, agora com `level`. Uma delas fica `active`. A bandeira no topo troca o par de hoje. Cada idioma tem deck, nível e prosa próprios.

Interesses são um `text[]` de no máximo doze itens (1 a 48 caracteres). Não são JSON.

## Conta

Criar conta pede e-mail, senha (8 a 72) e o par inicial. A sessão só nasce depois do código de seis dígitos. Sem canal de correio (Mailjet, Resend, Brevo ou SMTP/Mailpit), o registro responde 503.

Há também troca de senha (outras sessões caem), troca de e-mail com código, 2FA TOTP e/ou carta, reset com TTL de 15 minutos, lembrete diário na hora UTC escolhida. O tick corre na subida da API e a cada 15 minutos. A carta só sai se o lembrete estiver ligado e a prosa daquele dia civil ainda não tiver começado. Canal: Mailjet, depois Resend, Brevo ou SMTP.

Newsreader nos títulos, Source Sans 3 no corpo. Terracota e creme no claro (`#9A3412` / `#FFF8F1`).

## Elenco

Dezesseis figuras históricas em vinil, um papel cada:

| Papel | Mentes |
| --- | --- |
| Leitura | Einstein, Platão, Newton, Galileu |
| Memória | Curie, Aristóteles, Lovelace, Darwin |
| Fala | Feynman, Sócrates, Tesla, Cícero |
| Diário | da Vinci, Confúcio, Hipátia, Marco Aurélio |

## As peças

### Palácio da memória

Abre quando a carta já tem repetições e a taxa de falha passa de 60%. A associação nasce na língua de apoio e fica em `srs_mnemonics`.

### Gramática em quatro blocos

Dois toques pedem sujeito, conector, verbo e objeto. `vary` monta a frase nova e toca o áudio.

### Notícia

RSS allowlist, reescrito no nível (A2 / B1 / C1), com tradução no through. O cache separa por `native_lang`. Dictogloss: ouvir duas vezes e reescrever.

### Cadência

A gravação vai ao Gemini; os offsets vêm do Edge-TTS. Razão &lt; 0,75 apressou; &gt; 1,35 alongou.

### Reconstrução bidirecional

Âncora no dia 1; no vencimento a pessoa vê só a tradução. Nota, gramática e calques depois do envio.

### Duelo

120 segundos, lacuna, combo. Placar de contas reais daquele idioma. Sem ranking fictício.

### Cognatos no A1

As cinco primeiras lições A1 usam cognatos verdadeiros. Falsos amigos na leitura, não na história.

### Viva-voz

Tema, frase, quatro segundos, a mesma frase. Só voz neural.

### Mapa de retenção

Até quatro palavras por célula. A célula em risco abre só essas cartas.

### Cena e prosa viva

A cena segura um obstáculo e devolve dica cultural no through. A prosa viva conversa com a mente do dia sobre o tema, sem virar quiz de loja.

### Placement e can-do

Teste adaptativo, itens originais. Volta em três semanas ou após dez prosas. Can-do é checklist do nível atual.

### Exame e Prosa Score

Trilhas públicas (TOEFL, IELTS e as do idioma) com prompt nosso. O score some se a sessão foi corrida. `/cert/:token` é página pública.

### Pares, ownlife, medida, dossiê, org

Tandem por through/alvo. Texto da vida sem fetch. Retrievability FSRS e erros que saíram. Token para imprimir. Uma org, léxico do setor, custo real por sessão no admin.

## Administração

`ADMIN_EMAILS` vira `role = admin` no login. `/admin` vê contas, eventos e o interruptor da geração. Sem o papel: 403.

## O que o produto não é

Não há feed social, ranking inventado, segundo modelo no cliente, mascote de casa, chamada direta a provedores pagos, nem auto-confirmação de e-mail em produção. Português não se estuda como alvo.
