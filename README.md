# Trampo Flow

Aplicação full stack para acompanhar candidaturas de emprego. O backend é uma API Node.js com NestJS, Fastify, Prisma e PostgreSQL, organizada em camadas seguindo DDD e os princípios de SOLID. O frontend é uma SPA React com Vite, TypeScript e Tailwind CSS, estruturada em componentes, hooks e serviços.

## Stack

- **Node.js 24** e **TypeScript**
- **NestJS 12** com **Fastify** (`@nestjs/platform-fastify`)
- **Prisma ORM 6** para persistência no PostgreSQL
- **PostgreSQL 16** e **Adminer** via Docker Compose
- **class-validator** / **class-transformer** para validação dos DTOs
- **Vitest** para testes unitários com repositórios em memória
- **React 19**, **Vite 8**, **TypeScript 6** e **Tailwind CSS 4** no frontend
- **Lucide React**, **Axios** e **React Router 7** na interface web
- **Nginx** na borda (proxy de `/` e `/api`) e para servir o build de produção do frontend

## Arquitetura

O backend é organizado por camadas, com o contexto de candidaturas em `applications`.

| Camada | Responsabilidade | Dependências permitidas |
| ------ | ---------------- | ----------------------- |
| `domain` | Entidades, regras de negócio, enums, erros de domínio e interfaces de repositório | Nenhuma dependência de framework, HTTP ou banco |
| `application` | Casos de uso, DTOs de entrada e erros de aplicação | `domain`; `@Injectable` do Nest para DI e `class-validator` nos DTOs, sem HTTP ou Prisma |
| `infrastructure` | Controllers, módulos Nest, persistência Prisma, mappers, presenters e filtros HTTP | `application` e `domain` |

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

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `id` | UUID | Gerado na criação |
| `title` | string | Obrigatório, até 120 caracteres |
| `link` | string | Obrigatório, URL HTTP/HTTPS válida, até 2048 caracteres |
| `status` | enum | Um dos status fixos abaixo; padrão `PENDING` |
| `currentPhase` | string | Obrigatório, texto livre, até 120 caracteres |
| `files` | lista | Zero ou mais currículos/anexos |
| `createdAt` | data | Preenchido na criação |
| `updatedAt` | data | Atualizado em cada alteração |
| `deletedAt` | data ou nulo | Preenchido na exclusão lógica |

### Status fixos

| Valor na API | Rótulo |
| ------------ | ------ |
| `PENDING` | Aguardando |
| `IN_PROGRESS` | Em Andamento |
| `COMPLETED` | Finalizada |
| `REJECTED` | Recusada |

Os status são um conjunto fechado. A API retorna o valor do enum e a documentação mantém o rótulo em português.

### Arquivo (`ApplicationFile`)

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `id` | UUID | Gerado na criação |
| `name` | string | Obrigatório, até 255 caracteres |
| `url` | string | Obrigatório, URL HTTP/HTTPS válida, até 2048 caracteres |
| `mimeType` | string | Obrigatório, formato `type/subtype`, até 100 caracteres |
| `sizeInBytes` | inteiro | Positivo |
| `uploadedAt` | data | Opcional na entrada; padrão é o momento do anexo |

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
# Obrigatório: defina AUTH_USERNAME, AUTH_PASSWORD e JWT_SECRET
cp .env.example .env

# Sobe PostgreSQL, Adminer, API, frontend e ingress
docker compose up --build

# Ou em segundo plano
docker compose up -d --build
```

Na inicialização, o container da API executa `prisma migrate deploy` antes de iniciar o build compilado (`node dist/main`). As migrações existentes em `backend/prisma/migrations` são aplicadas automaticamente.

O serviço `ingress` é a única entrada pública no host (`127.0.0.1:${WEB_PORT:-5173}`). Ele encaminha `/api/*` para `http://api:3000`, removendo o prefixo `/api`, e o restante para `http://web:5173`. O container `web` serve apenas o build estático de produção com Nginx e fallback de SPA. API e frontend não publicam portas no host. O Compose padrão não monta o código como volume; para desenvolvimento com HMR, use o override `docker-compose.dev.yml`.

### Desenvolvimento com HMR

Para montar o código e subir API e frontend em modo desenvolvimento:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Nesse modo, a API roda `npm run start:dev` e o frontend roda o Vite com HMR. Os volumes `api_node_modules` e `web_node_modules` preservam as dependências. O acesso continua sendo pela porta do ingress, inclusive para o WebSocket do HMR; o roteamento de `/api` também é feito pelo ingress, e não pelo Vite.

> A migração `20261023230000_applications` substitui a antiga tabela `job_applications` pelas tabelas `applications` e `application_files`. A migração inicial é preservada para manter o histórico.

> Se você já executou uma versão anterior deste projeto, os volumes `trampo-flow_api_node_modules` e `trampo-flow_web_node_modules` podem conter dependências antigas. Remova-os antes de subir: `docker volume rm trampo-flow_api_node_modules trampo-flow_web_node_modules`.

### Serviços

| Serviço  | URL                       | Observações |
| -------- | ------------------------- | ----------- |
| Frontend | http://localhost:5173     | Entrada única pelo ingress; build de produção servido por Nginx |
| API      | http://localhost:5173/api | Via ingress; `GET /api/health` e `POST /api/auth/login` são públicos; demais rotas exigem JWT |
| Adminer  | http://localhost:8080     | Interface web do PostgreSQL em `127.0.0.1` |
| Postgres | `localhost:5432`          | Acesso por cliente SQL externo em `127.0.0.1` |

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

A API usa JWT assinado com HS256. Não há tabela de usuários: a aplicação valida um único usuário definido no `.env` da raiz, que é lido pelo serviço `api` via Docker Compose.

| Variável | Obrigatória | Descrição |
| -------- | ----------- | --------- |
| `AUTH_USERNAME` | sim | Usuário aceito no login |
| `AUTH_PASSWORD` | sim | Senha em texto plano no `.env` (não versionado) |
| `JWT_SECRET` | sim | Segredo HMAC com pelo menos 32 caracteres |
| `JWT_EXPIRES_IN` | não | Validade do token (`30m`, `8h`, `7d`); padrão `8h` |
| `LOGIN_MAX_ATTEMPTS` | não | Falhas consecutivas antes do bloqueio; padrão `10` |
| `LOGIN_WINDOW_SECONDS` | não | Janela e duração do bloqueio; padrão `900` |

Gere um segredo forte com `openssl rand -hex 32` e mantenha o `.env` fora do Git. Restrinja o arquivo ao seu usuário com `chmod 600 .env`. O login é feito em `POST /auth/login` e retorna um `accessToken`; envie-o nas demais rotas como `Authorization: Bearer <token>`.

```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"sua-senha"}'
```

Apenas `POST /auth/login` e `GET /health` são públicos. Todas as rotas de `/applications` e `GET /auth/me` passam pelo guard global. O frontend guarda o token no `localStorage`, restaura a sessão em `GET /auth/me` e remove o token em qualquer resposta `401`. O logout é local: um token já emitido continua válido até expirar. O JWT da aplicação é a única autenticação.

## Frontend

A interface web fica em `frontend/` e consome a API pela camada de serviços com Axios. A aplicação usa React Router, Tailwind CSS 4 (configuração CSS-first) e componentes base reutilizáveis.

### Arquitetura

```text
Página (pages)
  -> Componentes da feature (components/applications)
    -> Hook de estado (hooks/useApplications)
      -> Contexto compartilhado (contexts/ApplicationsContext)
        -> Serviço HTTP (services/api/applications.service)
          -> Cliente Axios (services/api/client)
            -> API NestJS
```

- `components/ui`: design system base (botões, inputs, cards, modais, badges, alertas, skeletons).
- `components/layout`: shell global com header, navegação, conteúdo e footer.
- `components/applications`: componentes específicos do domínio de candidaturas, incluindo abas de status (`ApplicationStatusTabs`) e upload de currículo (`ApplicationFileUpload`).
- `hooks`: lógica de listagem/mutações (`useApplications`), formulário (`useApplicationForm`) e controle de modais (`useDisclosure`).
- `contexts`: estado compartilhado de candidaturas.
- `services`: tipos do domínio, cliente Axios, normalização de erros e endpoints.
- `pages`: composição das telas e orquestração dos fluxos.

### Executar com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

O serviço `web` serve o build de produção com Nginx, mas não publica porta no host. O acesso fica em `http://localhost:5173` pelo serviço `ingress`, que encaminha `/api` para `http://api:3000` dentro da rede do Compose. Para desenvolvimento com HMR, use o override descrito em [Subir o ambiente](#subir-o-ambiente).

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

### Funcionalidades

- Abas de status com contadores (Todas, Aguardando, Em andamento, Finalizada e Recusada) no topo do dashboard.
- Cards com título clicável, link da vaga (hostname), status, fase atual e arquivos sempre visíveis.
- Busca por título ou fase atual, combinada com as abas de status.
- Criação e edição de candidaturas com título, link, fase, status e currículo.
- Input file para currículo (arraste e solte ou selecione): preenche nome, MIME e tamanho do anexo; a URL pública do documento é obrigatória porque a API armazena metadados, não binários.
- Anexo de novos arquivos na edição, preservando os existentes.
- Exclusão lógica (padrão) ou física, com aviso crítico e confirmação explícita por checkbox.
- Estados de carregamento, erro com retry, confirmação de sucesso e página 404.

Consulte [`frontend/README.md`](frontend/README.md) para a estrutura completa e os detalhes da arquitetura.

## API

> Todas as rotas de `/applications` exigem `Authorization: Bearer <token>`. Obtenha o token em `POST /auth/login`. `GET /health` e `POST /auth/login` são públicos. Nos exemplos abaixo, substitua `<token>` pelo `accessToken` retornado no login.
>
> A API é acessada pela entrada local do ingress em `http://localhost:5173/api`; o prefixo `/api` é removido antes de chegar à API. Se a API estiver rodando fora do Docker em `http://localhost:3000`, remova o prefixo `/api` das URLs.

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

| Campo | Tipo | Obrigatório | Regra |
| ----- | ---- | ----------- | ----- |
| `title` | string | sim | até 120 caracteres |
| `link` | string | sim | URL HTTP/HTTPS válida, até 2048 caracteres |
| `currentPhase` | string | sim | até 120 caracteres |
| `status` | enum | não | `PENDING`, `IN_PROGRESS`, `COMPLETED` ou `REJECTED`; padrão `PENDING` |
| `files` | array | não | lista de arquivos com os metadados abaixo |

Metadados de cada arquivo:

| Campo | Tipo | Obrigatório | Regra |
| ----- | ---- | ----------- | ----- |
| `name` | string | sim | até 255 caracteres |
| `url` | string | sim | URL HTTP/HTTPS válida, até 2048 caracteres |
| `mimeType` | string | sim | formato `type/subtype`, até 100 caracteres |
| `sizeInBytes` | inteiro | sim | maior que zero |
| `uploadedAt` | string | não | data ISO 8601; padrão é o momento do anexo |

### Listar candidaturas

```bash
curl http://localhost:5173/api/applications \
  -H 'Authorization: Bearer <token>'
```

Retorna apenas candidaturas ativas, ordenadas por `createdAt` decrescente.

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

```bash
curl -X POST http://localhost:5173/api/applications/<id>/files \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "files": [
      {
        "name": "portfolio.pdf",
        "url": "https://storage.example.com/portfolio.pdf",
        "mimeType": "application/pdf",
        "sizeInBytes": 204800
      }
    ]
  }'
```

É possível anexar um ou mais arquivos por requisição. Os arquivos existentes são preservados.

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

| Situação | HTTP | Código |
| -------- | ---- | ------ |
| Token ausente, inválido ou expirado | `401` | Mensagem padrão do guard |
| Muitas tentativas de login | `429` | `TOO_MANY_ATTEMPTS` |
| Recurso não encontrado | `404` | `APPLICATION_NOT_FOUND` |
| Candidatura já excluída | `409` | `APPLICATION_ALREADY_DELETED` |
| Modo de exclusão inválido | `400` | `INVALID_DELETE_MODE` |
| Validação de domínio | `400` | Código específico, como `TITLE_REQUIRED` |
| Validação de DTO | `400` | Formato padrão do NestJS com `statusCode: 400` |

## Testes

Os testes unitários usam **Vitest** e um repositório em memória que clona as entidades para isolar cada operação. Não é necessário banco de dados para executá-los.

```bash
cd backend

npm test             # executa todos os testes uma vez
npm run test:watch   # modo watch
npm run test:cov     # cobertura com V8
npm run test:typecheck # typecheck dos fontes e testes
```

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

Estrutura dos testes:

```text
backend/test/
├── application/
│   ├── add-application-files.use-case.spec.ts
│   ├── create-application.use-case.spec.ts
│   ├── delete-application.use-case.spec.ts
│   ├── list-applications.use-case.spec.ts
│   └── update-application.use-case.spec.ts
├── domain/
│   ├── application-file.entity.spec.ts
│   └── application.entity.spec.ts
├── infrastructure/
│   ├── auth.service.spec.ts
│   ├── jwt-auth.guard.spec.ts
│   ├── login-rate-limiter.service.spec.ts
│   └── token.service.spec.ts
├── factories/application.factory.ts
├── helpers/expect-domain-error.ts
└── repositories/in-memory-application.repository.ts
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
│   │   ├── application/
│   │   │   ├── shared/errors/
│   │   │   └── applications/
│   │   │       ├── dtos/
│   │   │       ├── errors/
│   │   │       ├── types/
│   │   │       └── use-cases/
│   │   ├── infrastructure/
│   │   │   ├── database/prisma/
│   │   │   │   ├── mappers/application.mapper.ts
│   │   │   │   ├── repositories/prisma-application.repository.ts
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── http/
│   │   │   │   ├── controllers/applications.controller.ts
│   │   │   │   ├── controllers/auth.controller.ts
│   │   │   │   ├── controllers/health.controller.ts
│   │   │   │   ├── filters/domain-exception.filter.ts
│   │   │   │   └── presenters/application.presenter.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── login-rate-limiter.service.ts
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── token.service.ts
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
│   │   │   ├── ApplicationsContext.tsx
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   │   ├── api/
│   │   │   ├── applications.types.ts
│   │   │   ├── auth.types.ts
│   │   │   └── index.ts
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
├── docker-compose.dev.yml
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

| Script | Descrição |
| ------ | --------- |
| `npm run start:dev` | Inicia em modo watch |
| `npm run build` | Compila para `dist/` |
| `npm run start:prod` | Executa o build compilado |
| `npm test` | Executa os testes unitários |
| `npm run test:cov` | Executa os testes com cobertura |
| `npm run test:typecheck` | Valida os tipos dos fontes e testes |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria/aplica migrações em desenvolvimento |
| `npm run prisma:studio` | Abre o Prisma Studio |

## Variáveis de ambiente

### Compose (raiz)

| Variável            | Padrão        | Descrição |
| ------------------- | ------------- | --------- |
| `POSTGRES_USER`     | `trampo`      | Usuário do PostgreSQL |
| `POSTGRES_PASSWORD` | `trampo_dev`  | Senha do PostgreSQL |
| `POSTGRES_DB`       | `trampo_flow` | Banco criado na inicialização |
| `POSTGRES_PORT`     | `5432`        | Porta do Postgres em `127.0.0.1` |
| `ADMINER_PORT`      | `8080`        | Porta do Adminer em `127.0.0.1` |
| `WEB_PORT`          | `5173`        | Porta local do ingress em `127.0.0.1` |
| `CORS_ORIGINS`      | origens locais | Origens permitidas no CORS da API (separadas por vírgula) |

As variáveis `AUTH_USERNAME`, `AUTH_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `LOGIN_MAX_ATTEMPTS` e `LOGIN_WINDOW_SECONDS` também ficam no `.env` da raiz e são repassadas ao serviço `api`; veja [Autenticação](#autenticação).

### Backend (`backend/.env`)

| Variável       | Padrão | Descrição |
| -------------- | ------ | --------- |
| `NODE_ENV`     | `development` | Ambiente de execução |
| `PORT`         | `3000` | Porta interna da API |
| `DATABASE_URL` | `postgresql://trampo:trampo_dev@localhost:5432/trampo_flow` | Conexão usada localmente e pelo Prisma CLI |
| `CORS_ORIGINS` | origens locais | Origens permitidas no CORS (separadas por vírgula) |

As variáveis de autenticação também são lidas do ambiente; veja [Autenticação](#autenticação).

No Docker, o Compose define `DATABASE_URL` apontando para o host `postgres` e sobrescreve o valor do `.env`.

### Frontend (`frontend/.env`)

| Variável | Padrão | Descrição |
| -------- | ------ | --------- |
| `VITE_API_URL` | `/api` | URL base usada pelo cliente Axios |
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

# Instalar dependências dentro dos containers no modo de desenvolvimento
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api npm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web npm install

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

No modo de desenvolvimento, o `prestart:dev` executa `prisma generate` a cada início. Se o volume de dependências estiver inconsistente, recrie-o:

```bash
docker compose down
docker volume rm trampo-flow_api_node_modules
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Frontend não conecta à API**

No Compose, o ingress encaminha `/api` para `http://api:3000` e `VITE_API_URL` é `/api`. Confirme que `web` e `api` estão saudáveis e que o ingress responde:

```bash
docker compose ps
docker compose logs -f ingress
docker compose exec ingress nginx -t
docker compose exec ingress wget -qO- http://api:3000/health
```

A entrada local é `http://localhost:5173`; o health check público local fica em `http://localhost:5173/api/health`. Se o HMR não conectar no modo de desenvolvimento, confirme que o navegador está usando a porta do ingress e revise o suporte a WebSocket em `infra/ingress/nginx.conf`. No desenvolvimento local fora do Docker, o proxy é feito pelo Vite com `VITE_API_PROXY_TARGET` (`http://localhost:3000`). Se estiver usando `VITE_API_URL` com uma URL absoluta, verifique o CORS da API.

Se as dependências do frontend no modo de desenvolvimento estiverem inconsistentes, recrie o volume:

```bash
docker compose down
docker volume rm trampo-flow_web_node_modules
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Banco em estado inconsistente**

```bash
docker compose down -v
docker compose up --build
```
