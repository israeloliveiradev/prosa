# Prosa

O Prosa é uma sessão diária de vinte minutos para estudar um idioma através de outro. A pessoa lê uma história, revisa o vocabulário com repetição espaçada, fala em voz alta e escreve um diário curto. O aplicativo nunca chama o modelo nem a voz neural direto: tudo passa pela API.

O repositório público é [israeloliveiradev/prosa](https://github.com/israeloliveiradev/prosa).

## O que a pessoa encontra

O menu tem sete destinos.

| Destino | Rota | O que guarda |
| --- | --- | --- |
| Início | `/` | A prosa do dia, o elenco e o idioma ativo |
| Notícias | `/news` | Até três histórias adaptadas ao nível |
| Prática | `/practice` | Duelo de 120 segundos e cena cultural |
| Memória | `/memory` | Mapa de retenção, deck, histórico e selos |
| Prosa | `/daily` | A sessão de vinte minutos |
| Pro | `/paywall` | A assinatura Prosa Pro |
| Conta | `/account` | Entrada, plano, idioma e interesses |

A sessão segue quatro etapas, nessa ordem: leitura, revisão, fala e diário. O relógio avança sozinho. No fim dos vinte minutos a pessoa pode abrir o duelo.

## Idiomas

O idioma de estudo é um destes: inglês, espanhol, alemão, russo, francês, italiano ou japonês (`en`, `es`, `de`, `ru`, `fr`, `it`, `ja`).

O idioma de apoio, aquele através do qual se estuda, inclui esses mesmos códigos e também o português (`pt`). Português não é alvo de estudo. Estudar um idioma através dele mesmo é recusado. Estudar alemão através do inglês é permitido.

A edição grátis guarda um par de idiomas e a lição de hoje. A Prosa Pro guarda o histórico, o tema escolhido, mais de um par e o uso contínuo da geração.

## Peças do produto

1. **Palácio da memória.** Uma carta com muitas repetições e mais de 60% de erro ganha uma associação vivida, pedida ao modelo e guardada em `srs_mnemonics`.
2. **Desconstrução gramatical.** Dois toques numa frase abrem quatro blocos: sujeito, conector, verbo e objeto. Trocar um bloco pede uma nova frase e o áudio dela.
3. **Notícia do dia.** Um feed RSS é reescrito no nível escolhido. A voz é a narradora da conta. As palavras novas podem entrar no deck.
4. **Radar de cadência.** A fala gravada é transcrita pelo Gemini. A precisão usa a distância de Levenshtein. O ritmo compara a duração de cada palavra com os offsets da voz neural.
5. **Reconstrução no terceiro dia.** No dia 1 a tradução fica guardada. No dia 3, com pelo menos dois dias de intervalo, só a tradução volta. A pessoa reescreve a história e recebe nota, erros gramaticais e calques.
6. **Duelo.** Cento e vinte segundos, quatro segundos por lacuna, quatro opções, combo de dez pontos vezes a sequência. O placar lista contas reais daquele idioma de estudo.
7. **Cognatos no A1.** As cinco primeiras lições A1 de uma conta usam cognatos verdadeiros e verbos frequentes. Falsos amigos aparecem na leitura, não na história.
8. **Viva-voz.** A leitura pode tocar sem a tela: cenário na língua de apoio, frase, quatro segundos de silêncio e a mesma frase de novo.
9. **Mapa de retenção.** Cada célula reúne até quatro palavras. Em risco, esquecendo, firmando ou memória longa (intervalo acima de 21 dias). A célula em risco abre a revisão só dessas palavras. A conta grava o dia em `user_retention_logs`.
10. **Cena.** Uma persona fala no idioma de estudo, no registro da situação. A dica cultural volta na língua de apoio e classifica o tom: serviu, direto demais, informal demais ou fora do costume.

## Como o sistema se divide

```text
aplicativo Expo  -->  API Fastify  -->  Gemini
                         |    \
                         |     \-->  Edge-TTS
                         |
                    Postgres 16 + Redis 7
```

| Parte | Onde | Função |
| --- | --- | --- |
| API | `src/` | Fastify, sessões, lições, áudio, cobrança |
| Voz | `services/edge-tts/` | MP3 neural e offsets de palavra |
| App | `mobile/` | Expo SDK 57, NativeWind, expo-audio |
| Esquema | `migrations/` | PostgreSQL 16, aditivo |
| Testes | `test/` | Regras puras, sem rede |

A documentação longa está em `docs/`.

| Documento | Conteúdo |
| --- | --- |
| [Visão do produto](docs/01-visao-do-produto.md) | Sessão, planos, idiomas, as dez peças |
| [Arquitetura](docs/02-arquitetura.md) | Processos, cache, modelo, limites |
| [Banco de dados](docs/03-banco-de-dados.md) | Tabelas, SM-2, ordem das migrações |
| [API](docs/04-api.md) | Cada rota, autenticação e códigos |
| [Áudio](docs/05-audio-e-voz.md) | Vozes, fila viva-voz, cadência |
| [Aplicativo](docs/06-aplicativo.md) | Telas, tema, estado local |
| [Desenvolvimento](docs/07-desenvolvimento.md) | Subir a stack, testar, publicar |

## Subir neste computador

É preciso Docker, Node.js 22 ou mais novo, e um arquivo `secrets/runtime.env` que não entra no Git.

```bash
cp secrets/runtime.env.example secrets/runtime.env
```

Preencha `POSTGRES_PASSWORD`, `REDIS_PASSWORD` e `GEMINI_API_KEY`. O modelo em uso neste projeto é o que estiver em `GEMINI_MODEL`. Sem a chave, as rotas de geração respondem 503.

```bash
docker compose up -d --build
```

Na primeira criação do volume, só `migrations/001_init_prosa_enterprise.sql` roda sozinha, pelo `docker-entrypoint-initdb.d`. As migrações seguintes são aditivas e entram com `psql`. O passo a passo está em [Banco de dados](docs/03-banco-de-dados.md).

Portas no host, todas em `127.0.0.1`:

| Serviço | Porta |
| --- | --- |
| API | 3000 |
| Postgres | 5433 |
| Redis | 6380 |
| Edge-TTS | 8077 |

Dentro da rede do Compose os nomes são `postgres:5432`, `redis:6379` e `edge-tts:8077`. As portas 5432 e 6379 do host ficam livres de propósito.

A saúde da API:

```bash
curl -sS http://127.0.0.1:3000/health
```

A resposta esperada é `{"status":"ok","schema":"007_cognates"}`.

O aplicativo, a partir de `mobile/`:

```bash
npm install
npx expo start --web --port 8081
```

`EXPO_PUBLIC_API_URL` aponta para a API. O padrão do código é `http://127.0.0.1:3000`.

## Testes

Na raiz:

```bash
npm test
```

Os testes cobrem distância de edição, chave de cache, esquemas Zod, notícia, vozes, palácio, gramática, cadência, reconstrução, pontuação do duelo, cognatos, fila do viva-voz, bandas de retenção e escolha de cenas. Eles não chamam o Gemini nem o banco.

## O que não entra no Git

`secrets/runtime.env` guarda senhas, a chave do Gemini e, se existirem, as chaves do Stripe. O exemplo versionado só tem nomes e valores fictícios. Não copie um ambiente real para o repositório.

## Licença e estado

O pacote da API está marcado como privado (`"private": true`). Este repositório publica o código-fonte para leitura e evolução. Não há, neste momento, uma licença de uso por terceiros além do que o dono do repositório decidir acrescentar.
