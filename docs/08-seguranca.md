# Segurança

Auditoria de pré-produção da API Fastify, do aplicativo Expo e da stack Docker. Controles existentes não foram tratados como suficientes só por existirem. Nenhuma credencial nova foi inventada.

## O que foi corrigido

### Privilege escalation no checkout (alto)

`GET /api/v1/billing/sessions/:id` promovia `users.plan = 'pro'` a partir de `client_reference_id` da Stripe, sem autenticação. Qualquer pessoa com um id `cs_...` (ou capaz de brute-force limitado) podia subir a conta de outra pessoa.

Agora a rota exige Bearer, recusa sessão cujo `client_reference_id` não é a conta do token (404), e só então faz `UPDATE ... WHERE id = conta autenticada`.

### Open redirect no checkout (alto)

`success_url` e `cancel_url` vinham do cliente e aceitavam qualquer `http(s)`. A Stripe mandaria o assinante para um host atacante.

Agora as URLs precisam ser origem da allowlist (`APP_PUBLIC_URL`, `localhost:8081`, `127.0.0.1:8081`, `CORS_ORIGINS`) ou `prosa://paywall`. Credenciais na URL são recusadas. O aplicativo web usa `window.location.origin/paywall`; o nativo usa `prosa://paywall`.

### CORS aberto (médio)

`origin: true` refletia qualquer Origin. A allowlist substitui isso. Métodos extra (PUT, DELETE) saíram. `credentials` permanece falso: a sessão é Bearer, não cookie.

Pedidos que mutam e trazem `Origin` fora da lista recebem 403. Pedidos sem Origin (Expo nativo, curl, healthcheck) seguem.

### Auto-verificação de e-mail (médio)

O registro, sem correio configurado, gravava `email_verified_at` e emitia sessão. Em produção com SMTP vazio isso virava conta sem prova de caixa.

O registro agora responde 503 `"Mail is not configured"` e não cria a sessão. Contas antigas receberam data na migração 015.

### Sessão sem e-mail verificado (médio)

`requireUser` agora exige `email_verified_at IS NOT NULL`. Login de conta não verificada devolve `requires_verify` em vez de token.

### Troca de senha sem revogar sessões (médio)

Outras sessões da conta caem. A sessão atual permanece. Reset de senha já apagava todas; continua assim. Troca de e-mail confirmada também derruba as outras.

### Lockout além do rate limit (médio)

Oito tentativas por minuto no IP não impedem um ataque distribuído no mesmo e-mail. Dez falhas em quinze minutos na identidade (login, verify, reset, 2FA) viram 429. O contador está em Redis, chave `prosa:lock:...` com SHA-256.

### Vazamento de erro (médio)

A falha da Stripe devolveva `payload.error.message` ao cliente. A ausência da chave Gemini citava `GEMINI_API_KEY`. O handler agora esconde 5xx que parecem segredo. Stripe vira `"Payment provider request failed"`. Gemini vira `"Lesson generation is unavailable"`. O log redige senha, código, ticket e Authorization.

### Cabeçalhos e cache (médio)

Toda resposta ganha `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restrita e `Cache-Control: no-store`, salvo o MP3 neural (`private, max-age=86400`). `Cross-Origin-Resource-Policy` é `cross-origin` para o app em outra origem continuar lendo JSON e áudio.

### Clique duplo (baixo / médio)

Registro e checkout usam `SET NX` curto (`prosa:once:...`). A UI já desliga o botão com `pending`.

### SMTP CRLF (baixo)

`MAIL FROM` e `RCPT TO` passam por validador que recusa CR, LF, espaços e `<>`. Cabeçalhos From/To/Subject perdem quebras de linha.

### Admin LIKE (baixo)

`%` e `_` da busca são escapados. A cláusula usa `ESCAPE`.

### Ticket 2FA no Redis (baixo)

A chave passou a ser `prosa:2fa:${sha256(ticket)}`. Um dump do Redis não entrega o ticket usável.

### Inbox do Mailpit (baixo)

`mail_inbox_url` só volta ao cliente se o host for `localhost` ou `127.0.0.1`.

### SSRF da notícia (baixo, defesa em profundidade)

O `fetch` de RSS só aceita HTTPS nos hosts do catálogo e usa `redirect: error`.

### Arquivos sensíveis

`.gitignore` passa a cobrir `.env` e `.env.*` além de `secrets/*.env`. `.dockerignore` já excluía `secrets`. Portas do Compose continuam em `127.0.0.1`.

### Dependências

`npm audit --omit=dev` nas dependências de produção: zero vulnerabilidades conhecidas neste momento.

## O que já estava seguro e permaneceu

- Senhas em Argon2id, nunca em claro, nunca devolvidas.
- SQL parametrizado (`$1`, `$2`). Não há concatenação de identificador de usuário.
- Token de sessão aleatório de 32 bytes, armazenado como SHA-256.
- Segredos fora do Git e fora da imagem.
- Docker `USER node`.
- Upload: um arquivo, 10 MiB, MIME de áudio, sem persistir nome no disco.
- Neural TTS só fala com `EDGE_TTS_URL`.
- SRS recusa `user_id` diferente da sessão (403).
- Admin exige `role = admin`.
- Rate limit global Redis 120/min, com tetos menores em auth e speak.
- CSRF clássico de cookie: a API não usa cookie de sessão; usa Bearer. A allowlist de Origin cobre o app web.
- Hash de preenchimento no login para não vazar se o e-mail existe pelo timing do Argon2.
- Forgot/resend sempre `{ ok: true }`.
- Códigos de e-mail e reset são seis dígitos com hash no Redis e comparação em tempo constante.
- Stripe Checkout só com `client_reference_id` da conta autenticada.

## Riscos que permanecem

| Risco | Por que ficou | O que fazer na operação |
| --- | --- | --- |
| Speak, shadowing, journal e notícia sem login | Produto: visitante ouve e pratica | Os tetos por IP continuam; um WAF na frente ajuda em produção |
| Sem webhook Stripe | O plano sobe no GET autenticado da sessão | Em produção, ligar webhook `checkout.session.completed` e deixar o GET como fallback |
| `GET /health` mostra o nome do esquema | Útil para o Compose e para o operador | Colocar a API atrás de rede privada; não expor 3000 na internet sem proxy |
| TOTP em setup vive 10 minutos no Redis em claro | Precisa do segredo até o confirm | Redis só na rede Docker, com senha |
| `ADMIN_EMAILS` promove no login | É o mecanismo combinado | Manter a lista curta; quem sair da lista não perde o papel já gravado até um UPDATE manual |
| Sem CSP no Expo web | O Metro não serve um `index.html` nosso | CSP no proxy reverso, se o app web for público |
| Sem HSTS na API local | HTTP em `127.0.0.1` | HSTS no TLS do proxy em produção |
| Postgres `listen_addresses=*` no container | Padrão Docker; a porta do host é `127.0.0.1:5433` | Não publicar 5433 em `0.0.0.0` |
| Auditoria de npm é um instante | Pacotes mudam | Rodar `npm audit` de novo antes de cada release |

## Ações manuais antes de produção

1. Preencher `secrets/runtime.env` na máquina (nunca no Git): senhas, `GEMINI_API_KEY`, `ADMIN_EMAILS`.
2. Ligar correio de verdade (`MAILJET_API_KEY` e `MAILJET_API_SECRET`, ou Resend/Brevo, com `MAIL_FROM` verificado). Sem isso o Compose cai no Mailpit local; sem nenhum canal o registro fica 503.
3. Ajustar `APP_PUBLIC_URL` para a origem pública do app. Se houver mais origens, `CORS_ORIGINS`.
4. Se houver Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, e de preferência um webhook além do GET de sessão.
5. Não expor 3000, 5433, 6380, 8077, 8025 nem 1025 em `0.0.0.0`. O Compose local já prende em `127.0.0.1`.
6. Colocar TLS e, se quiser, HSTS/CSP no proxy da frente.
7. Confirmar que `015_verify` rodou: `curl -sS http://127.0.0.1:3000/health` deve trazer `"schema":"015_verify"`.
8. Não copiar `runtime.env` para o repositório, para tickets, nem para o chat.

## Como conferir neste computador

```bash
npm test
npm audit --omit=dev
curl -sS http://127.0.0.1:3000/health
```

Um GET anônimo em `/api/v1/billing/sessions/cs_test` precisa ser 401, não uma promoção de plano.
