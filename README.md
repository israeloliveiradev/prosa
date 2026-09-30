# Prosa

O Prosa é uma sessão diária de vinte minutos para estudar um idioma através de outro. A pessoa lê uma história, revisa o vocabulário com repetição espaçada, fala em voz alta e escreve um diário curto. O aplicativo nunca chama o modelo, a voz neural nem o Stripe: tudo passa pela API.

O repositório público é [israeloliveiradev/prosa](https://github.com/israeloliveiradev/prosa).

## O que a pessoa encontra

| Destino | Rota | O que guarda |
| --- | --- | --- |
| Início | `/` | A prosa do dia, o elenco e o idioma ativo |
| Notícias | `/news` | Até três histórias adaptadas ao nível |
| Prática | `/practice` | Duelo de 120 segundos e cena cultural |
| Memória | `/memory` | Mapa de retenção, deck, histórico e selos |
| Prosa | `/daily` | A sessão de vinte minutos |
| Pro | `/paywall` | A assinatura Prosa Pro |
| Conta | `/account` | Entrada, verificação de e-mail, 2FA |
| Ajustes | `/settings` | Nome, senha, e-mail, lembrete, mentes, tema |
| Como usar | `/guide` | O caminho das telas |
| Administração | `/admin` | Clientes, gráficos de 14 dias, eventos e interruptor da geração. Só admin |

A sessão segue quatro etapas, nessa ordem: leitura, revisão, fala e diário. Cada etapa tem um gênio em boneco de vinil (Einstein, Curie, Feynman, da Vinci no padrão). O relógio avança sozinho. No fim dos vinte minutos a pessoa pode abrir o duelo.

A interface usa Newsreader nos títulos e Source Sans 3 no corpo, com tema terracota e creme.

## Idiomas

O idioma de estudo é um destes: inglês, espanhol, alemão, russo, francês, italiano ou japonês (`en`, `es`, `de`, `ru`, `fr`, `it`, `ja`).

O idioma de apoio inclui esses mesmos códigos e também o português (`pt`). Português não é alvo de estudo. Estudar um idioma através dele mesmo é recusado.

A edição grátis guarda um par de idiomas e a lição de hoje. A Prosa Pro guarda o histórico, o tema escolhido, mais de um par e o uso contínuo da geração.

## Peças do produto

1. **Palácio da memória.** Uma carta com muitas repetições e mais de 60% de erro ganha uma associação vivida, pedida ao modelo e guardada em `srs_mnemonics`.
2. **Desconstrução gramatical.** Dois toques numa frase abrem quatro blocos: sujeito, conector, verbo e objeto.
3. **Notícia do dia.** Um feed RSS allowlist é reescrito no nível escolhido. A voz é a narradora da conta.
4. **Radar de cadência.** A fala gravada é transcrita pelo Gemini. O ritmo compara a duração de cada palavra com os offsets da voz neural.
5. **Reconstrução no terceiro dia.** No dia 1 a tradução fica guardada. No dia 3 a pessoa reescreve a história.
6. **Duelo.** Cento e vinte segundos, quatro opções, combo. O placar lista contas reais daquele idioma.
7. **Cognatos no A1.** As cinco primeiras lições A1 usam cognatos verdadeiros. Falsos amigos aparecem na leitura.
8. **Viva-voz.** A leitura pode tocar sem a tela, só com voz neural.
9. **Mapa de retenção.** Cada célula reúne até quatro palavras. A conta grava o dia em `user_retention_logs`.
10. **Cena.** Uma persona fala no idioma de estudo. A dica cultural volta na língua de apoio.

A conta confirma o e-mail com código de seis dígitos, pode ligar TOTP e OTP por carta, e redefine senha pelo mesmo canal.

## Como o sistema se divide

```text
aplicativo Expo  -->  API Fastify  -->  Gemini
                         |    \
                         |     \-->  Edge-TTS
                         |
                    Postgres 16 + Redis 7
                    Mailpit (dev) / SMTP, Resend ou Brevo
```

| Parte | Onde | Função |
| --- | --- | --- |
| API | `src/` | Fastify, sessões, lições, áudio, cobrança, correio |
| Segurança | `src/security/` | CORS, lockout, URLs de retorno, SMTP, RSS |
| Voz | `services/edge-tts/` | MP3 neural e offsets de palavra |
| App | `mobile/` | Expo SDK 57, NativeWind, expo-audio |
| Esquema | `migrations/` | PostgreSQL 16, aditivo, até `015_verify` |
| Testes | `test/` | Regras puras, sem rede |

A documentação longa está em `docs/`.

| Documento | Conteúdo |
| --- | --- |
| [Visão do produto](docs/01-visao-do-produto.md) | Sessão, planos, elenco, as dez peças |
| [Arquitetura](docs/02-arquitetura.md) | Processos, cache, modelo, limites |
| [Banco de dados](docs/03-banco-de-dados.md) | Tabelas, SM-2, ordem das migrações, Redis |
| [API](docs/04-api.md) | Cada rota, autenticação e códigos |
| [Áudio](docs/05-audio-e-voz.md) | Vozes, fila viva-voz, cadência |
| [Aplicativo](docs/06-aplicativo.md) | Telas, tema, tipo, estado local |
| [Desenvolvimento](docs/07-desenvolvimento.md) | Subir a stack, testar, publicar |
| [Segurança](docs/08-seguranca.md) | Auditoria, correções, riscos, ações manuais |

## Subir neste computador

É preciso Docker, Node.js 22 ou mais novo, e um arquivo `secrets/runtime.env` que não entra no Git.

```bash
cp secrets/runtime.env.example secrets/runtime.env
```

Preencha `POSTGRES_PASSWORD`, `REDIS_PASSWORD` e `GEMINI_API_KEY`. O modelo em uso é o que estiver em `GEMINI_MODEL`. Sem a chave, as rotas de geração respondem 503. `MAILJET_API_KEY` e `MAILJET_API_SECRET` (ou Resend/Brevo) entregam o correio na caixa real; sem isso o Compose usa o Mailpit. Sem nenhum canal, o registro responde 503. `ADMIN_EMAILS` lista os e-mails que abrem a administração.

```bash
docker compose up -d --build
```

Na primeira criação do volume, só `migrations/001_init_prosa_enterprise.sql` roda sozinha. As migrações seguintes são aditivas e entram com `psql`, até `015_verify`. O passo a passo está em [Banco de dados](docs/03-banco-de-dados.md).

Portas no host, todas em `127.0.0.1`:

| Serviço | Porta |
| --- | --- |
| API | 3000 |
| Postgres | 5433 |
| Redis | 6380 |
| Edge-TTS | 8077 |
| Mailpit UI | 8025 |
| Mailpit SMTP | 1025 |

Dentro da rede do Compose os nomes são `postgres:5432`, `redis:6379`, `edge-tts:8077` e `mailpit:1025`. As portas 5432 e 6379 do host ficam livres de propósito.

A saúde da API:

```bash
curl -sS http://127.0.0.1:3000/health
```

A resposta esperada é `{"status":"ok","schema":"015_verify"}`.

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

Os testes cobrem distância de edição, chave de cache, esquemas Zod, notícia, vozes, palácio, gramática, cadência, reconstrução, duelo, cognatos, viva-voz, retenção, cenas, TOTP, cartas, mentes e as regras de segurança. Eles não chamam o Gemini nem o banco.

## O que não entra no Git

`secrets/runtime.env` guarda senhas, a chave do Gemini e, se existirem, as chaves do Stripe. `.env` na raiz também fica de fora. O exemplo versionado só tem nomes e valores fictícios. Não copie um ambiente real para o repositório.

## Licença e estado

O pacote da API está marcado como privado (`"private": true`). Este repositório publica o código-fonte para leitura e evolução. Não há, neste momento, uma licença de uso por terceiros além do que o dono do repositório decidir acrescentar.
