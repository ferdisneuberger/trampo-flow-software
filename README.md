# Trampo Flow

[![CI](https://github.com/ferdisneuberger/trampo-flow-software/actions/workflows/ci.yml/badge.svg)](https://github.com/ferdisneuberger/trampo-flow-software/actions/workflows/ci.yml)

Aplicação full stack para acompanhar candidaturas de emprego. O backend é uma API Node.js com NestJS, Fastify, Prisma e PostgreSQL, organizada em camadas seguindo DDD e os princípios de SOLID. O frontend é uma SPA React com Vite, TypeScript e Tailwind CSS, estruturada em componentes, hooks e serviços.

## Principais mudanças da 2.0

- Candidaturas por usuário, com empresa e site.
- Quadro kanban com arrastar e soltar e reordenação manual persistida.
- Busca no servidor e quadro kanban como tela inicial.
- Upload de PDF e TXT em storage compatível com S3.
- Sessão com access token curto em memória e refresh token em cookie `HttpOnly`.
- Detalhe da candidatura com edição e exclusão.

O histórico completo está em [CHANGELOG.md](CHANGELOG.md).

## Stack

- **Node.js 24** e **TypeScript**
- **NestJS 12** com **Fastify** (`@nestjs/platform-fastify`)
- **Prisma ORM 6** para persistência no PostgreSQL
- **PostgreSQL 16** e **Adminer** via Docker Compose
- **class-validator** / **class-transformer** para validação dos DTOs
- **Vitest** para testes unitários com repositórios em memória
- **React 19**, **Vite 8**, **TypeScript 6** e **Tailwind CSS 4** no frontend
- **Lucide React**, **Axios**, **React Router 7**, **TanStack Query** e **dnd-kit** na interface web
- **Nginx** na borda (proxy de `/` e `/api`) e para servir o build de produção do frontend

## Arquitetura

O backend é organizado por camadas, com o contexto de candidaturas em `applications`.

| Camada           | Responsabilidade                                                                   | Dependências permitidas                                                                  |
| ---------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `domain`         | Entidades, regras de negócio, enums, erros de domínio e interfaces de repositório  | Nenhuma dependência de framework, HTTP ou banco                                          |
| `application`    | Casos de uso, DTOs de entrada e erros de aplicação                                 | `domain`; `@Injectable` do Nest para DI e `class-validator` nos DTOs, sem HTTP ou Prisma |
| `infrastructure` | Controllers, módulos Nest, persistência Prisma, mappers, presenters e filtros HTTP | `application` e `domain`                                                                 |

### Fluxo de uma requisição

```text
HTTP (Fastify)
  -> Controller
    -> Use Case
      -> Repository (interface no domínio)
        <- PrismaApplicationRepository (implementação na infraestrutura)
          -> PostgreSQL
```

O controller não conhece Prisma. O caso de uso não conhece HTTP nem banco. A entidade de domínio não conhece NestJS.

### Injeção de dependência

A interface `ApplicationRepository` é uma classe abstrata usada como token do NestJS. O módulo da feature faz o binding para a implementação concreta:

```ts
{
  provide: ApplicationRepository,
  useClass: PrismaApplicationRepository,
}
```

Assim, os casos de uso dependem da abstração, e a infraestrutura escolhe a implementação. Isso aplica o Dependency Inversion Principle (DIP) e permite trocar o Prisma por outro adapter sem alterar as regras de negócio.

### Entrada da aplicação

O `backend/src/main.ts` configura:

- `FastifyAdapter` como driver HTTP do NestJS, sem confiar em headers de proxy
- `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e `transform`
- `DomainExceptionFilter` global, convertendo erros de domínio/aplicação em respostas HTTP
- `JwtAuthGuard` global com rotas públicas anotadas por `@Public()`
- `Cache-Control: no-store` e headers de segurança em todas as respostas
- CORS e shutdown hooks
- Porta via `ConfigService` e bind em `0.0.0.0`

## Modelo de domínio

### Candidatura (`Application`)

| Campo          | Tipo           | Regra                                                   |
| -------------- | -------------- | ------------------------------------------------------- |
| `id`           | UUID           | Gerado na criação                                       |
| `title`        | string         | Obrigatório, até 120 caracteres                         |
| `link`         | string         | Obrigatório, URL HTTP/HTTPS válida, até 2048 caracteres |
| `company`      | string         | Obrigatório, 2 a 120 caracteres                         |
| `companyUrl`   | string ou nulo | Opcional, URL HTTP/HTTPS válida, até 2048 caracteres    |
| `position`     | inteiro        | Ordem manual dentro da coluna do quadro                 |
| `status`       | enum           | Um dos status fixos abaixo; padrão `PENDING`            |
| `currentPhase` | string         | Obrigatório, texto livre, até 120 caracteres            |
| `files`        | lista          | Zero ou mais currículos/anexos                          |
| `createdAt`    | data           | Preenchido na criação                                   |
| `updatedAt`    | data           | Atualizado em cada alteração                            |
| `deletedAt`    | data ou nulo   | Preenchido na exclusão lógica                           |

### Status fixos

| Valor na API  | Rótulo       |
| ------------- | ------------ |
| `PENDING`     | Aguardando   |
| `IN_PROGRESS` | Em Andamento |
| `COMPLETED`   | Finalizada   |
| `REJECTED`    | Recusada     |

Os status são um conjunto fechado. A API retorna o valor do enum e a documentação mantém o rótulo em português.

### Arquivo (`ApplicationFile`)

| Campo         | Tipo    | Regra                                                   |
| ------------- | ------- | ------------------------------------------------------- |
| `id`          | UUID    | Gerado na criação                                       |
| `name`        | string  | Obrigatório, até 255 caracteres                         |
| `url`         | string  | Obrigatório, URL HTTP/HTTPS válida, até 2048 caracteres |
| `mimeType`    | string  | Obrigatório, formato `type/subtype`, até 100 caracteres |
| `sizeInBytes` | inteiro | Positivo                                                |
| `uploadedAt`  | data    | Opcional na entrada; padrão é o momento do anexo        |

O agregado permite múltiplos arquivos por candidatura. O backend armazena os metadados e a URL do arquivo; o upload binário para um storage externo não faz parte desta etapa.

### Exclusão lógica e física

- `DELETE /applications/:id` ou `DELETE /applications/:id?mode=soft` faz exclusão lógica: preenche `deletedAt` e mantém o registro.
- `DELETE /applications/:id?mode=hard` remove fisicamente a candidatura e seus arquivos.
- Candidaturas com exclusão lógica não aparecem em `GET /applications`.
- Editar ou excluir logicamente uma candidatura já excluída retorna `409` com `APPLICATION_ALREADY_DELETED`.
- Uma candidatura com exclusão lógica ainda pode ser removida fisicamente com `mode=hard`.

## Pré-requisitos

Para rodar tudo com Docker:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou Docker Engine + Docker Compose v2
- Navegador moderno para acessar a interface
- Portas `5173`, `8080` e `5432` livres, ou valores diferentes definidos no `.env` (`WEB_PORT` é a porta pública do ingress)

Para rodar a API e/ou o frontend fora do Docker:

- Node.js 24+ com npm
- PostgreSQL 16 local ou em container

Confirme o Docker:

```bash
docker --version
docker compose version
```

## Subir o ambiente

Na raiz do projeto:

```bash
# Obrigatório: defina AUTH_EMAIL, AUTH_PASSWORD e JWT_SECRET
cp .env.example .env

# Sobe PostgreSQL, Adminer, API, frontend e ingress
docker compose up --build

# Ou em segundo plano
docker compose up -d --build
```

Na inicialização, o container da API executa `prisma migrate deploy` antes de iniciar o build compilado (`node dist/main`). As migrações existentes em `backend/prisma/migrations` são aplicadas automaticamente.

O serviço `ingress` é a única entrada pública no host (`127.0.0.1:${WEB_PORT:-5173}`). Ele encaminha `/api/*` para `http://api:3000`, removendo o prefixo `/api`, e o restante para `http://web:5173`. O container `web` serve apenas o build estático de produção com Nginx e fallback de SPA. API e frontend não publicam portas no host. O Compose padrão não monta o código como volume; alterações exigem rebuild da imagem.

> A migração `20261023230000_applications` substitui a antiga tabela `job_applications` pelas tabelas `applications` e `application_files`. A migração inicial é preservada para manter o histórico.

### Serviços

| Serviço  | URL                       | Observações                                                                                   |
| -------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| Frontend | http://localhost:5173     | Entrada única pelo ingress; build de produção servido por Nginx                               |
| API      | http://localhost:5173/api | Via ingress; `GET /api/health` e `POST /api/auth/login` são públicos; demais rotas exigem JWT |
| Adminer  | http://localhost:8080     | Interface web do PostgreSQL em `127.0.0.1`                                                    |
| Postgres | `localhost:5432`          | Acesso por cliente SQL externo em `127.0.0.1`                                                 |

A API não publica a porta `3000` e o container `web` não publica a `5173`; o único serviço com porta publicada para acesso externo é o `ingress` (`127.0.0.1:${WEB_PORT:-5173}`). A API só é acessível pela rede do Compose ou pela entrada do ingress.

### Adminer

| Campo    | Valor         |
| -------- | ------------- |
| Sistema  | PostgreSQL    |
| Servidor | `postgres`    |
| Usuário  | `trampo`      |
| Senha    | `trampo_dev`  |
| Base     | `trampo_flow` |

Os valores são os padrões do `docker-compose.yml`. Se você alterou o `.env`, use os valores correspondentes.

### Autenticação

A API usa JWT assinado com HS256. Os usuários ficam na tabela `users` do PostgreSQL, com a senha derivada por **scrypt** (N=16384, r=8, p=1, sal de 16 bytes e chave de 64 bytes). O hash tem o formato `scrypt$N$r$p$sal$chave`, então subir o custo depois não invalida as senhas existentes.

| Variável                       | Obrigatória | Descrição                                                 |
| ------------------------------ | ----------- | --------------------------------------------------------- |
| `JWT_SECRET`                   | sim         | Segredo HMAC com pelo menos 32 caracteres                 |
| `JWT_EXPIRES_IN`               | não         | Validade do access token (`5m`, `30m`, `8h`); padrão `5m` |
| `REFRESH_TOKEN_TTL_DAYS`       | não         | Validade do refresh token; padrão `7`                     |
| `REFRESH_TOKEN_GRACE_SECONDS`  | não         | Tolerância de reuso entre abas; padrão `10`               |
| `LOGIN_MAX_ATTEMPTS`           | não         | Falhas consecutivas antes do bloqueio; padrão `10`        |
| `LOGIN_WINDOW_SECONDS`         | não         | Janela e duração do bloqueio; padrão `900`                |
| `AUTH_EMAIL`                   | não         | E-mail criado no primeiro boot, se a tabela estiver vazia |
| `AUTH_PASSWORD`                | não         | Senha do primeiro usuário (mínimo de 12 caracteres)       |
| `AUTH_TOKEN_SECRET`            | sim         | Segredo HMAC dos tokens de verificação (32+ caracteres)   |
| `APP_BASE_URL`                 | não         | URL pública usada nos links dos e-mails                   |
| `REGISTRATION_ENABLED`         | não         | Liga/desliga o cadastro público; padrão `false`           |
| `EMAIL_VERIFICATION_TTL_HOURS` | não         | Validade do código de verificação; padrão `24`            |
| `VERIFICATION_RESEND_SECONDS`  | não         | Cooldown de reenvio; padrão `120`                         |
| `PASSWORD_RESET_TTL_MINUTES`   | não         | Validade do link de recuperação; padrão `60`              |
| `TERMS_VERSION`                | não         | Versão dos termos aceita no cadastro; padrão `2026-11`    |
| `SMTP_HOST`                    | não         | Servidor SMTP; padrão `smtp.gmail.com`                    |
| `SMTP_PORT`                    | não         | Porta SMTP; padrão `587`                                  |
| `SMTP_SECURE`                  | não         | TLS direto; padrão `false` (STARTTLS)                     |
| `SMTP_USER`                    | não         | Conta SMTP                                                |
| `SMTP_PASS`                    | não         | App Password do Gmail                                     |
| `MAIL_FROM`                    | não         | Remetente dos e-mails                                     |
| `MAIL_FROM_NAME`               | não         | Nome exibido no remetente; padrão `Trampo Flow`           |
| `MAILPIT_PORT`                 | não         | Porta local do Mailpit; padrão `8025`                     |

`AUTH_EMAIL`/`AUTH_PASSWORD` servem apenas para provisionar o **primeiro** usuário. Se a tabela `users` já tem registros, elas são ignoradas — depois do primeiro boot você pode removê-las do `.env` e trocar a senha direto no banco (com um hash scrypt novo). A senha nunca é comparada em texto puro.

Gere um segredo forte com `openssl rand -hex 32` e mantenha o `.env` fora do Git. Restrinja o arquivo ao seu usuário com `chmod 600 .env`. O login é feito em `POST /auth/login` e retorna um `accessToken`; envie-o nas demais rotas como `Authorization: Bearer <token>`.

```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"pessoa@exemplo.com","password":"sua-senha"}'
```

O `sub` do token é o **id** do usuário (UUID). O guard valida a assinatura e confirma que o usuário ainda existe no banco a cada requisição, então apagar um usuário invalida os tokens dele imediatamente.

#### Cadastro e verificação de e-mail

O cadastro público é controlado por `REGISTRATION_ENABLED`. Quando habilitado, `POST /auth/register` cria a conta com `email_verified_at` vazio e envia um código de 6 caracteres no formato `ADK-7YP`. O código é armazenado apenas como HMAC-SHA256, expira em 24 horas e é consumido por `POST /auth/verification/confirm`. Após a confirmação, um segundo e-mail avisa que a conta está verificada.

```bash
curl -X POST http://localhost:5173/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"pessoa@exemplo.com","password":"senha-super-secreta","termsAccepted":true}'

curl -X POST http://localhost:5173/api/auth/verification/confirm \
  -H 'content-type: application/json' \
  -d '{"token":"ADK-7YP"}'
```

Usuários não verificados podem entrar, mas ainda não podem criar candidaturas. O bloqueio é feito no backend com `403 EMAIL_NOT_VERIFIED` e reforçado no frontend. Em desenvolvimento, o Mailpit captura os e-mails em `http://localhost:8025`; para usar o Gmail real, configure `SMTP_HOST=smtp.gmail.com` e a App Password em `SMTP_PASS`.

#### Recuperação de senha

`POST /auth/password/forgot` sempre responde de forma genérica. Se existir uma conta com senha, um link de alta entropia é enviado e expira em 60 minutos. O link abre `/redefinir-senha`, onde o usuário escolhe a nova senha. Ao concluir, o token é consumido e **todas as sessões** da conta são revogadas.

```bash
curl -X POST http://localhost:5173/api/auth/password/forgot \
  -H 'content-type: application/json' \
  -d '{"email":"pessoa@exemplo.com"}'

curl -X POST http://localhost:5173/api/auth/password/reset \
  -H 'content-type: application/json' \
  -d '{"token":"token-recebido-no-email","password":"nova-senha-segura"}'
```

As rotas de `/applications` operam apenas sobre as candidaturas do usuário do token. Um id pertencente a outra conta responde `404`, e não `403`, para não revelar que o registro existe.

#### Sessão e refresh token

O login devolve um **access token** de curta duração e grava um **refresh token** opaco em cookie `HttpOnly` (não acessível a JavaScript), `SameSite=Strict` e `Secure` em produção. O refresh token tem validade de 7 dias e é armazenado no banco apenas como hash SHA-256.

```http
POST /auth/refresh   → novo access token + cookie rotacionado
POST /auth/logout    → revoga a família e limpa o cookie
```

Cada refresh rotaciona o token: o anterior é revogado e aponta para o substituto. Se um token já revogado for reapresentado fora de uma janela de tolerância de 10 segundos, a **família inteira** é revogada — é a detecção de reuso. A janela existe para duas abas renovando ao mesmo tempo não derrubarem a sessão.

`POST /auth/login`, `POST /auth/register`, `POST /auth/verification/confirm`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `POST /auth/refresh`, `POST /auth/logout` e `GET /health` são públicos. `POST /auth/verification/resend` exige sessão. Todas as rotas de `/applications` e `GET /auth/me` passam pelo guard global. O frontend mantém o access token apenas em memória, restaura a sessão com `POST /auth/refresh` + `GET /auth/me` e limpa o cache de queries em qualquer resposta `401`. O logout chama `POST /auth/logout`, revoga a família do refresh token e limpa o cookie. Credenciais inválidas recebem sempre `401` com a mesma mensagem, e o hash é executado mesmo quando o usuário não existe, para não revelar quais e-mails estão cadastrados.

## Frontend

A interface web fica em `frontend/` e consome a API pela camada de serviços com Axios. A aplicação usa React Router, Tailwind CSS 4 (configuração CSS-first) e componentes base reutilizáveis.

### Arquitetura

```text
Página (pages/ApplicationsPage)
  -> Quadro (components/applications/Board)
    -> Hook de dados (hooks/useBoard)
      -> Serviço HTTP (services/api/applications.service)
        -> Cliente Axios (services/api/client)
          -> API NestJS

Página (pages/ApplicationDetailPage)
  -> Hook de mutations (hooks/useApplicationMutations)
    -> Serviço HTTP
```

- `components/ui`: design system base (botões, inputs, cards, modais, menu, badges, alertas, skeletons e error boundary).
- `components/layout`: shell global com navegação, skip link, logout e error boundary por rota.
- `components/applications`: quadro, colunas, cards, formulário e diálogo de exclusão.
- `hooks`: query/mutations (`useBoard`, `useApplicationMutations`), formulário (`useApplicationForm`), debounce, disclosure e logout.
- `contexts`: sessão autenticada e evento de `401`.
- `lib`: query client, query keys e invalidação centralizada.
- `services`: tipos do domínio, cliente Axios, normalização de erros, refresh deduplicado e endpoints.
- `pages`: composição das telas e orquestração dos fluxos.

A tela inicial é `/candidaturas`; não há visão de lista nem painel de estatísticas. A rota `/` redireciona para o quadro.

### Executar com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

O serviço `web` serve o build de produção com Nginx, mas não publica porta no host. O acesso fica em `http://localhost:5173` pelo serviço `ingress`, que encaminha `/api` para `http://api:3000` dentro da rede do Compose. Para desenvolvimento local fora do Docker, veja [Executar localmente](#executar-localmente).

Para acompanhar os logs:

```bash
docker compose logs -f web
```

### Executar localmente

Com a API em execução em `http://localhost:3000`:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A interface fica disponível em `http://localhost:5173`. O Vite encaminha `/api/*` para o backend e remove o prefixo `/api`; assim, o cliente usa `VITE_API_URL=/api` sem problemas de CORS em desenvolvimento. O build de produção é estático, e o proxy equivalente fica em `infra/ingress/nginx.conf` quando o ambiente roda pelo Compose.

### Testes

O frontend usa **Vitest** com **Testing Library** e ambiente `jsdom`. Os testes cobrem os utilitários, o interceptor do Axios, o `tokenStorage`, o hook `useApplicationForm` e o badge de status.

```bash
cd frontend

npm test        # executa uma vez
npm run test:watch
npm run test:cov
```

A cobertura é medida em `src/**` inteiro, mas o threshold é aplicado apenas onde há suíte de verdade: `src/utils/**` (95%) e `src/hooks/useApplicationForm.ts` (75%). Componentes e páginas ainda não têm teste, então uma meta global seria enganosa.

### Testes de ponta a ponta

O fluxo crítico (login → criar → buscar → detalhe → excluir) roda com **Playwright** contra o ambiente do Compose.

```bash
docker compose up -d
cd frontend
npx playwright install chromium
E2E_USERNAME=... E2E_PASSWORD=... npm run test:e2e
```

Sem `E2E_USERNAME` e `E2E_PASSWORD`, o teste é pulado. No CI, o workflow `E2E` sobe o Compose, cria um usuário de teste pelo bootstrap e roda o fluxo em um Chromium.

Para rodar localmente sem tocar no seu banco, use o script de stack isolado:

```bash
npm run test:e2e:local
```

Ele sobe um projeto Compose separado (`trampo-e2e`) em `http://127.0.0.1:6173`, com banco próprio, e derruba tudo no final. O workflow de E2E roda em pull requests que tocam frontend/backend/infra, sob demanda (`workflow_dispatch`) e em schedule noturno.

### Funcionalidades

- Quadro Kanban como tela inicial (`/candidaturas`), com colunas por status e arrastar e soltar.
- Cards com título clicável, empresa, fase atual e data.
- Busca por título, empresa ou fase no servidor; a busca desativa temporariamente o arrastar.
- Criação e edição de candidaturas com título, link, fase e status.
- Exclusão lógica (padrão) ou física, com aviso crítico e confirmação explícita por checkbox.
- Estados de carregamento, erro com retry, confirmação de sucesso, 404 e error boundary.
- Cadastro público com verificação de e-mail por código, termos de uso e bloqueio de criação até a confirmação.
- Sessão com access token em memória, refresh deduplicado, logout no servidor e limpeza de cache no `401`.

Consulte [`frontend/README.md`](frontend/README.md) para a estrutura completa e os detalhes da arquitetura.

## API

> Todas as rotas de `/applications` exigem `Authorization: Bearer <token>`. Obtenha o token em `POST /auth/login`. `GET /health`, `POST /auth/login`, `POST /auth/register`, `POST /auth/verification/confirm`, `POST /auth/password/forgot` e `POST /auth/password/reset` são públicos. Nos exemplos abaixo, substitua `<token>` pelo `accessToken` retornado no login.
>
> A API é acessada pela entrada local do ingress em `http://localhost:5173/api`; o prefixo `/api` é removido antes de chegar à API. Se a API estiver rodando fora do Docker em `http://localhost:3000`, remova o prefixo `/api` das URLs.
>
> A documentação interativa (OpenAPI) fica em `/docs`: `http://localhost:5173/docs` pelo ingress ou `http://localhost:3000/docs` rodando fora do Docker. O JSON da especificação está em `/docs-json`.

### Health check

```bash
curl http://localhost:5173/api/health
```

```json
{ "status": "ok", "database": "up" }
```

Se o banco estiver indisponível, a resposta é `503` com `{ "status": "degraded", "database": "down" }`.

### Criar candidatura

```bash
curl -X POST http://localhost:5173/api/applications \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Backend Engineer",
    "link": "https://example.com/jobs/backend-engineer",
    "company": "Nubank",
    "companyUrl": "https://nubank.com.br",
    "currentPhase": "Triagem",
    "files": [
      {
        "name": "curriculo.pdf",
        "url": "https://storage.example.com/curriculo.pdf",
        "mimeType": "application/pdf",
        "sizeInBytes": 102400
      }
    ]
  }'
```

Campos aceitos:

| Campo          | Tipo   | Obrigatório | Regra                                                                 |
| -------------- | ------ | ----------- | --------------------------------------------------------------------- |
| `title`        | string | sim         | até 120 caracteres                                                    |
| `link`         | string | sim         | URL HTTP/HTTPS válida, até 2048 caracteres                            |
| `company`      | string | sim         | 2 a 120 caracteres                                                    |
| `companyUrl`   | string | não         | URL HTTP/HTTPS válida, até 2048 caracteres                            |
| `currentPhase` | string | sim         | até 120 caracteres                                                    |
| `status`       | enum   | não         | `PENDING`, `IN_PROGRESS`, `COMPLETED` ou `REJECTED`; padrão `PENDING` |
| `files`        | array  | não         | lista de arquivos com os metadados abaixo                             |

Metadados de cada arquivo:

| Campo         | Tipo    | Obrigatório | Regra                                      |
| ------------- | ------- | ----------- | ------------------------------------------ |
| `name`        | string  | sim         | até 255 caracteres                         |
| `url`         | string  | sim         | URL HTTP/HTTPS válida, até 2048 caracteres |
| `mimeType`    | string  | sim         | formato `type/subtype`, até 100 caracteres |
| `sizeInBytes` | inteiro | sim         | maior que zero                             |
| `uploadedAt`  | string  | não         | data ISO 8601; padrão é o momento do anexo |

### Listar candidaturas

```bash
curl 'http://localhost:5173/api/applications?search=nubank&status=IN_PROGRESS&limit=25' \
  -H 'Authorization: Bearer <token>'
```

```json
{
  "items": [{ "id": "…", "title": "…", "company": "…" }],
  "nextCursor": "eyJzIjoicmVjZW50Iiwid…",
  "hasMore": true
}
```

| Parâmetro | Padrão   | Regra                                                               |
| --------- | -------- | ------------------------------------------------------------------- |
| `search`  | —        | Busca em `title`, `company` e `currentPhase`, sem diferenciar caixa |
| `status`  | —        | `PENDING`, `IN_PROGRESS`, `COMPLETED` ou `REJECTED`                 |
| `limit`   | `25`     | Entre 1 e 100                                                       |
| `sort`    | `recent` | `recent` (criação mais nova) ou `stale` (atualização mais antiga)   |
| `cursor`  | —        | Use o `nextCursor` da página anterior. Cursor inválido responde 400 |

A paginação é por chave (`createdAt` + `id`, ou `updatedAt` + `id` em `stale`), então duas páginas consecutivas nunca repetem nem pulam itens. Candidaturas excluídas logicamente ficam de fora.

### Contadores por status

```bash
curl http://localhost:5173/api/applications/stats \
  -H 'Authorization: Bearer <token>'
```

```json
{
  "total": 12,
  "byStatus": { "PENDING": 3, "IN_PROGRESS": 5, "COMPLETED": 4, "REJECTED": 0 }
}
```

Os contadores consideram todas as candidaturas ativas do usuário e ignoram os filtros de busca.

### Mover no quadro

```bash
curl -X PATCH http://localhost:5173/api/applications/<id>/placement \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{ "status": "IN_PROGRESS", "beforeId": "<id-acima>", "afterId": "<id-abaixo>" }'
```

| Campo      | Obrigatório | Regra                                     |
| ---------- | ----------- | ----------------------------------------- |
| `status`   | não         | Destino; mantém o atual quando omitido    |
| `beforeId` | não         | Candidatura que fica imediatamente acima  |
| `afterId`  | não         | Candidatura que fica imediatamente abaixo |

A posição é calculada em múltiplos de 1000. Quando o intervalo entre dois vizinhos chega a
1, a coluna é reindexada na mesma transação. Vizinho de outro status responde `400`
(`INVALID_PLACEMENT`). Candidaturas novas entram no fim da coluna.

### Atualizar candidatura

```bash
curl -X PATCH http://localhost:5173/api/applications/<id> \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Staff Engineer",
    "currentPhase": "Entrevista com RH",
    "status": "IN_PROGRESS"
  }'
```

Todos os campos são opcionais, mas pelo menos um deve ser enviado. Campos aceitos: `title`, `link`, `currentPhase` e `status`.

### Anexar arquivos

Envio real de binário, com limite de **5 MB** por arquivo e **3 arquivos** por candidatura. Apenas **PDF** e **TXT** são aceitos; o tipo é validado pela extensão e pelos primeiros bytes, não pelo `Content-Type` enviado.

```bash
curl -X POST http://localhost:5173/api/applications/<id>/files/upload \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@curriculo.pdf'
```

O arquivo é gravado no storage S3/MinIO e o registro guarda apenas a chave do objeto, o tamanho e o checksum SHA-256. O nome enviado é usado só para exibição.

```bash
# download autenticado, sempre como anexo
curl -OJ http://localhost:5173/api/applications/<id>/files/<fileId>/download \
  -H 'Authorization: Bearer <token>'

# remover um arquivo
curl -X DELETE http://localhost:5173/api/applications/<id>/files/<fileId> \
  -H 'Authorization: Bearer <token>'
```

Arquivos cadastrados antes deste recurso continuam aparecendo como link externo (`url` no payload, sem `downloadUrl`).

### Excluir candidatura

```bash
# Exclusão lógica (padrão)
curl -X DELETE 'http://localhost:5173/api/applications/<id>' \
  -H 'Authorization: Bearer <token>'

# Exclusão lógica explícita
curl -X DELETE 'http://localhost:5173/api/applications/<id>?mode=soft' \
  -H 'Authorization: Bearer <token>'

# Exclusão física
curl -X DELETE 'http://localhost:5173/api/applications/<id>?mode=hard' \
  -H 'Authorization: Bearer <token>'
```

As exclusões bem-sucedidas retornam `204 No Content`.

### Formato dos erros

Erros de domínio e aplicação:

```json
{
  "error": "INVALID_LINK",
  "message": "Link must be a valid HTTP or HTTPS URL."
}
```

| Situação                            | HTTP  | Código                                         |
| ----------------------------------- | ----- | ---------------------------------------------- |
| Token ausente, inválido ou expirado | `401` | Mensagem padrão do guard                       |
| Muitas tentativas de login          | `429` | `TOO_MANY_ATTEMPTS`                            |
| Recurso não encontrado              | `404` | `APPLICATION_NOT_FOUND`                        |
| Candidatura já excluída             | `409` | `APPLICATION_ALREADY_DELETED`                  |
| Modo de exclusão inválido           | `400` | `INVALID_DELETE_MODE`                          |
| Validação de domínio                | `400` | Código específico, como `TITLE_REQUIRED`       |
| Validação de DTO                    | `400` | Formato padrão do NestJS com `statusCode: 400` |

## Testes

Os testes unitários usam **Vitest** e um repositório em memória que clona as entidades para isolar cada operação. Não é necessário banco de dados para executá-los.

```bash
cd backend

npm test             # executa todos os testes uma vez
npm run test:watch   # modo watch
npm run test:cov     # cobertura com V8
npm run test:typecheck # typecheck dos fontes e testes
```

### Testes de integração com Postgres

O repositório Prisma é testado contra um PostgreSQL real, com migrations aplicadas e `TRUNCATE` entre os casos. Esses testes são pulados quando `TEST_DATABASE_URL` não está definida, então `npm test` continua funcionando sem banco.

```bash
# cria um banco separado, terminado em _test
docker compose exec postgres createdb -U trampo trampo_flow_test

cd backend
TEST_DATABASE_URL=postgresql://trampo:trampo_dev@127.0.0.1:5432/trampo_flow_test \
  npm run test:cov
```

O helper de teste recusa qualquer URL cujo banco não termine em `_test` e recusa uma URL igual a `DATABASE_URL`, para que um valor copiado por engano não apague dados de desenvolvimento.

O `TEST_DATABASE_URL` também é o que ativa o threshold de cobertura: sem ele, os arquivos pulados distorceriam a média e o limite é ignorado.

Cenários cobertos:

- Criação com status padrão, status explícito, múltiplos arquivos e metadados.
- Validação de título, link, fase, status e metadados dos arquivos.
- Atualização de título, link, fase atual e todos os status fixos.
- Atualização parcial, preservação de arquivos e atualização de `updatedAt`.
- Rejeição de atualização sem campos, de candidatura inexistente e de candidatura excluída.
- Anexo de um ou vários arquivos, preservação dos existentes e rejeição de metadados inválidos.
- Exclusão lógica padrão, exclusão lógica explícita, exclusão física e purge de registro já excluído.
- Rejeição de segunda exclusão lógica, modo inválido e candidatura inexistente.
- Listagem apenas de candidaturas ativas.
- Regras das entidades `Application` e `ApplicationFile`.
- Autenticação do usuário único, emissão/validação do JWT e rejeição de tokens inválidos.
- Bloqueio global de login após falhas consecutivas, expiração da janela e reset em caso de sucesso.
- Guard global: rotas públicas, preflight, token ausente, esquema inválido e token de outro usuário.
- Mapper Prisma ↔ domínio: round-trip, todos os status, arquivos aninhados e `deletedAt`.
- Presenter HTTP: campos, datas em ISO e lista de arquivos.
- Filtro de exceções: mapeamento de domínio para 400, 404 e 409.
- Controllers: conversão de `uploadedAt`, repasse de campos e modo de exclusão.
- Repositório Prisma contra Postgres: persistência, filtro de excluídos, ordenação,
  inclusão e remoção de arquivos na mesma transação, exclusão em cascata.

Estrutura dos testes:

```text
backend/test/
├── application/
│   ├── add-application-files.use-case.spec.ts
│   ├── authenticate-user.use-case.spec.ts
│   ├── create-application.use-case.spec.ts
│   ├── delete-application.use-case.spec.ts
│   ├── get-user-profile.use-case.spec.ts
│   ├── list-applications.use-case.spec.ts
│   └── update-application.use-case.spec.ts
├── domain/
│   ├── application-file.entity.spec.ts
│   ├── application.entity.spec.ts
│   ├── password-policy.spec.ts
│   └── user.entity.spec.ts
├── infrastructure/
│   ├── application.mapper.spec.ts
│   ├── application.presenter.spec.ts
│   ├── applications.controller.spec.ts
│   ├── auth.controller.spec.ts
│   ├── auth.service.spec.ts
│   ├── domain-exception.filter.spec.ts
│   ├── health.controller.spec.ts
│   ├── jwt-auth.guard.spec.ts
│   ├── login-rate-limiter.service.spec.ts
│   ├── prisma-application.repository.spec.ts
│   ├── prisma-user.repository.spec.ts
│   ├── prisma.service.spec.ts
│   ├── scrypt.spec.ts
│   ├── token.service.spec.ts
│   ├── user-bootstrap.service.spec.ts
│   └── user.mapper.spec.ts
├── factories/application.factory.ts
├── helpers/expect-domain-error.ts
├── helpers/test-database.ts
├── repositories/in-memory-application.repository.ts
└── repositories/in-memory-user.repository.ts
```

## Estrutura do projeto

```text
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │       ├── migration_lock.toml
│   │       ├── 20261023220000_init/
│   │       │   └── migration.sql
│   │       └── 20261023230000_applications/
│   │           └── migration.sql
│   ├── src/
│   │   ├── domain/
│   │   │   ├── shared/
│   │   │   │   ├── errors/domain.error.ts
│   │   │   │   └── validation/
│   │   │   └── applications/
│   │   │       ├── entities/
│   │   │       │   ├── application.entity.ts
│   │   │       │   └── application-file.entity.ts
│   │   │       ├── enums/application-status.enum.ts
│   │   │       └── repositories/application.repository.ts
│   │   │   └── users/
│   │   │       ├── entities/user.entity.ts
│   │   │       ├── repositories/user.repository.ts
│   │   │       └── services/
│   │   │           ├── password-hasher.ts
│   │   │           └── password-policy.ts
│   │   ├── application/
│   │   │   ├── shared/errors/
│   │   │   └── applications/
│   │   │       ├── dtos/
│   │   │       ├── errors/
│   │   │       ├── types/
│   │   │       └── use-cases/
│   │   ├── infrastructure/
│   │   │   ├── database/prisma/
│   │   │   │   ├── mappers/
│   │   │   │   │   ├── application.mapper.ts
│   │   │   │   │   └── user.mapper.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── prisma-application.repository.ts
│   │   │   │   │   └── prisma-user.repository.ts
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── http/
│   │   │   │   ├── controllers/applications.controller.ts
│   │   │   │   ├── controllers/auth.controller.ts
│   │   │   │   ├── controllers/health.controller.ts
│   │   │   │   ├── filters/domain-exception.filter.ts
│   │   │   │   └── presenters/application.presenter.ts
│   │   │   ├── auth/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── login-rate-limiter.service.ts
│   │   │   │   ├── public.decorator.ts
│   │   │   │   ├── scrypt-password-hasher.ts
│   │   │   │   ├── scrypt.ts
│   │   │   │   ├── token.service.ts
│   │   │   │   └── user-bootstrap.service.ts
│   │   │   └── modules/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── vitest.config.mts
│   ├── tsconfig.test.json
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── applications/
│   │   │   ├── auth/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── config/env.ts
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── auth-context.ts
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── services/
│   │   │   ├── api/
│   │   │   ├── applications.types.ts
│   │   │   └── auth.types.ts
│   │   ├── styles/index.css
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── README.md
├── infra/
│   └── ingress/
│       └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## Desenvolvimento local da API

Com o PostgreSQL do Compose em execução:

```bash
docker compose up -d postgres

cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

O `backend/.env.example` aponta para `localhost:5432`. O `prestart:dev` executa `prisma generate` antes de iniciar o watch mode.

Scripts disponíveis em `backend/package.json`:

| Script                    | Descrição                                |
| ------------------------- | ---------------------------------------- |
| `npm run start:dev`       | Inicia em modo watch                     |
| `npm run build`           | Compila para `dist/`                     |
| `npm run start:prod`      | Executa o build compilado                |
| `npm test`                | Executa os testes unitários              |
| `npm run test:cov`        | Executa os testes com cobertura          |
| `npm run test:typecheck`  | Valida os tipos dos fontes e testes      |
| `npm run prisma:generate` | Gera o Prisma Client                     |
| `npm run prisma:migrate`  | Cria/aplica migrações em desenvolvimento |
| `npm run prisma:studio`   | Abre o Prisma Studio                     |

## Variáveis de ambiente

### Compose (raiz)

| Variável            | Padrão         | Descrição                                                 |
| ------------------- | -------------- | --------------------------------------------------------- |
| `POSTGRES_USER`     | `trampo`       | Usuário do PostgreSQL                                     |
| `POSTGRES_PASSWORD` | `trampo_dev`   | Senha do PostgreSQL                                       |
| `POSTGRES_DB`       | `trampo_flow`  | Banco criado na inicialização                             |
| `POSTGRES_PORT`     | `5432`         | Porta do Postgres em `127.0.0.1`                          |
| `ADMINER_PORT`      | `8080`         | Porta do Adminer em `127.0.0.1`                           |
| `WEB_PORT`          | `5173`         | Porta local do ingress em `127.0.0.1`                     |
| `CORS_ORIGINS`      | origens locais | Origens permitidas no CORS da API (separadas por vírgula) |

As variáveis `AUTH_EMAIL`, `AUTH_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `LOGIN_MAX_ATTEMPTS` e `LOGIN_WINDOW_SECONDS` também ficam no `.env` da raiz e são repassadas ao serviço `api`; veja [Autenticação](#autenticação).

### Backend (`backend/.env`)

| Variável       | Padrão                                                      | Descrição                                          |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `NODE_ENV`     | `development`                                               | Ambiente de execução                               |
| `PORT`         | `3000`                                                      | Porta interna da API                               |
| `DATABASE_URL` | `postgresql://trampo:trampo_dev@localhost:5432/trampo_flow` | Conexão usada localmente e pelo Prisma CLI         |
| `CORS_ORIGINS` | origens locais                                              | Origens permitidas no CORS (separadas por vírgula) |

As variáveis de autenticação também são lidas do ambiente; veja [Autenticação](#autenticação).

No Docker, o Compose define `DATABASE_URL` apontando para o host `postgres` e sobrescreve o valor do `.env`.

### Storage (`api`)

Os anexos ficam em um bucket compatível com S3. No Compose, o MinIO sobe junto e o bucket é criado no boot da API.

| Variável        | Padrão              | Descrição                               |
| --------------- | ------------------- | --------------------------------------- |
| `S3_ENDPOINT`   | `minio`             | Host do storage                         |
| `S3_PORT`       | `9000`              | Porta                                   |
| `S3_USE_SSL`    | `false`             | Usa TLS                                 |
| `S3_ACCESS_KEY` | `trampo`            | Credencial de acesso                    |
| `S3_SECRET_KEY` | `trampo_dev_secret` | Credencial secreta (troque em produção) |
| `S3_BUCKET`     | `trampo-files`      | Bucket onde os arquivos são gravados    |
| `S3_REGION`     | `us-east-1`         | Região informada ao cliente             |

### Frontend (`frontend/.env`)

| Variável                | Padrão                  | Descrição                                                    |
| ----------------------- | ----------------------- | ------------------------------------------------------------ |
| `VITE_API_URL`          | `/api`                  | URL base usada pelo cliente Axios                            |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Destino do proxy `/api` apenas no Vite local (`npm run dev`) |

No Compose, o proxy `/api` é definido em `infra/ingress/nginx.conf` e aponta para `http://api:3000` dentro da rede do Compose; o Vite não faz proxy nesse ambiente. O `frontend/nginx.conf` de produção serve apenas os arquivos estáticos. Mantenha `VITE_API_URL=/api`. Se publicar o frontend separado da API, defina `VITE_API_URL` com a URL absoluta da API e ajuste o CORS no backend.

## Comandos úteis

```bash
# Status dos containers
docker compose ps

# Logs da API
docker compose logs -f api

# Logs do frontend
docker compose logs -f web

# Logs do ingress
docker compose logs -f ingress

# Rebuild das imagens após alterar o package.json
docker compose build api web

# Validar a configuração do ingress e recriá-lo após alterar infra/ingress/nginx.conf
docker compose exec ingress nginx -t
docker compose up -d --force-recreate ingress

# Criar uma nova migração localmente
cd backend
npx prisma migrate dev --name nome_da_migracao
cd ..

# Regenerar o Prisma Client
docker compose exec api npx prisma generate

# Parar os containers (mantém os dados)
docker compose down

# Parar e apagar os volumes (apaga o banco)
docker compose down -v
```

## Solução de problemas

**Porta em uso**

Altere `WEB_PORT`, `POSTGRES_PORT` ou `ADMINER_PORT` no `.env` e suba novamente com `docker compose up -d`. A API e o frontend não publicam portas no host; apenas o ingress usa `WEB_PORT`.

**API não fica saudável**

```bash
docker compose logs postgres
docker compose logs api
```

Verifique se o Postgres está saudável e se `DATABASE_URL` aponta para o host correto.

**Edge retorna 502 após recriar a API ou o frontend**

O Nginx resolve `api` e `web` na inicialização. Se esses containers forem recriados com novos endereços, recrie o ingress para atualizar a resolução interna:

```bash
docker compose up -d --force-recreate ingress
```

**Prisma Client desatualizado após mudar o schema**

```bash
docker compose build api
docker compose up -d api
```

**Frontend não conecta à API**

No Compose, o ingress encaminha `/api` para `http://api:3000` e `VITE_API_URL` é `/api`. Confirme que `web` e `api` estão saudáveis e que o ingress responde:

```bash
docker compose ps
docker compose logs -f ingress
docker compose exec ingress nginx -t
docker compose exec ingress wget -qO- http://api:3000/health
```

A entrada local é `http://localhost:5173`; o health check público local fica em `http://localhost:5173/api/health`. No desenvolvimento local fora do Docker, o proxy é feito pelo Vite com `VITE_API_PROXY_TARGET` (`http://localhost:3000`). Se estiver usando `VITE_API_URL` com uma URL absoluta, verifique o CORS da API.

**Banco em estado inconsistente**

```bash
docker compose down -v
docker compose up --build
```

## Decisões e limitações conhecidas

Esta seção deixa explícito o que o projeto **não** faz, e por quê. Nenhum item é bug: são escolhas de escopo, cada uma com a alternativa que seria necessária para mudar.

- **Sessão no navegador.** O access token fica apenas em memória; o refresh token fica em cookie `HttpOnly` + `SameSite=strict`. O refresh é rotacionado e deduplicado no cliente. Logout e `401` limpam o cache de queries. Para trocar para outro transporte, revise CORS/CSRF e a configuração do cookie.
- **Logout.** O frontend chama `POST /auth/logout` antes de limpar o estado local; se a API estiver indisponível, o logout local ainda acontece e o cookie pode permanecer válido até expirar.
- **Rate limit de login.** Em memória, global e por janela fixa; zera no restart e não é compartilhado entre réplicas. Para mudar: contador no Postgres (ou Redis) por `username` + IP, com janela deslizante.
- **Listagem.** A interface usa o quadro (`GET /applications/board`); a API mantém o endpoint de listagem paginada para integrações e estatísticas.
- **Arquivos.** `ApplicationFile` guarda nome, MIME, tamanho e URL; não há upload de binário. Para mudar: storage de objetos (S3/MinIO) com URL pré-assinada e upload multipart.
- **Usuários.** A tabela `users` existe no Postgres, mas não há registro público nem troca de senha pela interface: criar usuário é operação administrativa. Para mudar: endpoint de troca de senha com invalidação de tokens e, se fizer sentido, cadastro por convite.
- **Papéis e permissões.** Cada usuário enxerga apenas as próprias candidaturas, mas não há papéis (administrador, leitor) nem compartilhamento entre contas. Para mudar: modelo de papéis e regras de autorização por recurso.
- **Custo do guard.** Valida a assinatura e consulta `users` a cada requisição (um `SELECT` por chave primária). Para mudar: cache em memória com TTL curto, se o volume justificar.
- **Testes de UI.** Componentes e páginas têm testes com Testing Library, os hooks/serviços têm cobertura e o Playwright cobre o caminho crítico (login, criação, busca, detalhe e exclusão). O E2E roda em PRs, sob demanda e em schedule.
- **Observabilidade.** Log padrão do Nest/Fastify, sem request-id nem métricas. Para mudar: Pino estruturado, correlação de requisição e endpoint de métricas.

## Licença

MIT — veja [LICENSE](LICENSE).

Para reportar uma vulnerabilidade, siga [SECURITY.md](SECURITY.md). Não abra issue pública.
