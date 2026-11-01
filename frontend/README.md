# Trampo Flow — Frontend

Interface web para acompanhar candidaturas de emprego. Construída com React, Vite e TypeScript, consome a API NestJS do diretório `../backend`.

## Stack

- **React 19** com **TypeScript 6**
- **Vite 8** para desenvolvimento e build
- **Nginx** (imagem unprivileged) para servir o build de produção
- **Tailwind CSS 4** via `@tailwindcss/vite` (configuração CSS-first)
- **Lucide React** para ícones
- **Axios** em uma camada de serviço isolada
- **React Router 7** para navegação

## Arquitetura

A aplicação separa apresentação, estado e acesso à API:

```text
Página (pages)
  -> Rota protegida (components/auth/ProtectedRoute)
    -> Contexto de autenticação (contexts/AuthContext)
  -> Componentes da feature (components/applications)
    -> Hook de estado (hooks/useApplications)
      -> Contexto compartilhado (contexts/ApplicationsContext)
        -> Serviço HTTP (services/api/applications.service)
          -> Cliente Axios (services/api/client)
            -> API NestJS
```

| Camada                    | Responsabilidade                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `components/ui`           | Design system base: botões, inputs, cards, modais, badges, alertas e estados vazios |
| `components/auth`         | Rota protegida e tela de carregamento da sessão                                     |
| `components/layout`       | Estrutura global da aplicação (header, navegação, conteúdo e footer)                |
| `components/applications` | Componentes específicos do domínio de candidaturas                                  |
| `pages`                   | Composição das telas e orquestração dos fluxos                                      |
| `hooks`                   | Lógica de estado e comportamento reutilizável                                       |
| `contexts`                | Estado compartilhado de candidaturas e de autenticação                              |
| `services`                | Tipos do domínio, autenticação e chamadas HTTP isoladas                             |
| `config`                  | Configurações derivadas de variáveis de ambiente                                    |
| `utils`                   | Funções puras de formatação, validação e classes CSS                                |
| `styles`                  | Tokens do tema e estilos globais do Tailwind                                        |

### Decisões de design

- **Separação de lógica e apresentação:** `useApplications` concentra busca, mutações e erros; `useApplicationForm` concentra valores, validação, anexos e submit; `useDisclosure` controla modais; os componentes apenas renderizam e disparam ações.
- **Estado compartilhado:** `ApplicationsProvider` mantém a lista de candidaturas e as operações CRUD disponíveis via `useApplicationsContext`.
- **Serviço isolado:** nenhum componente importa Axios diretamente. `applicationsService` expõe `list`, `create`, `update`, `addFiles` e `remove`.
- **Sessão JWT:** o login em `/login` obtém um token, guarda no `localStorage` e o cliente Axios injeta `Authorization: Bearer` em todas as chamadas. `AuthProvider` restaura a sessão via `GET /auth/me`; qualquer `401` limpa o token e devolve o usuário ao login.
- **Erros normalizados:** o interceptor do Axios converte falhas de rede e respostas da API em `ApiError`, com mensagem amigável.
- **Formulário validado localmente:** título (120), link HTTP/HTTPS (2048), fase (120), nome de arquivo (255), URL (2048), MIME `type/subtype` (100) e tamanho inteiro positivo.
- **Upload como metadados:** o input file lê nome, MIME e tamanho do currículo e preenche o rascunho do anexo. Como a API não recebe binários, o formulário exige a URL pública do documento antes de salvar.
- **Exclusão com confirmação explícita:** o diálogo usa aviso crítico em vermelho e só habilita o botão após o usuário marcar a confirmação.
- **Tailwind CSS-first:** os tokens de marca, superfície, tinta e borda ficam em `src/styles/index.css` no bloco `@theme`.

## Estrutura de diretórios

```text
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthLoadingScreen.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── applications/
│   │   │   ├── ApplicationCard.tsx
│   │   │   ├── ApplicationFileUpload.tsx
│   │   │   ├── ApplicationForm.tsx
│   │   │   ├── ApplicationList.tsx
│   │   │   ├── ApplicationListSkeleton.tsx
│   │   │   ├── ApplicationStats.tsx
│   │   │   ├── ApplicationStatusBadge.tsx
│   │   │   └── ApplicationStatusTabs.tsx
│   │   ├── layout/
│   │   │   └── AppShell.tsx
│   │   └── ui/
│   │       ├── Alert.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── PageHeader.tsx
│   │       ├── Select.tsx
│   │       ├── Skeleton.tsx
│   │       └── StatCard.tsx
│   ├── config/
│   │   └── env.ts
│   ├── contexts/
│   │   ├── ApplicationsContext.tsx
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useApplicationForm.ts
│   │   ├── useApplications.ts
│   │   └── useDisclosure.ts
│   ├── pages/
│   │   ├── ApplicationsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── applications.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── client.ts
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   └── token-storage.ts
│   │   ├── applications.types.ts
│   │   ├── auth.types.ts
│   │   └── index.ts
│   ├── styles/
│   │   └── index.css
│   ├── utils/
│   │   ├── applications.ts
│   │   ├── cn.ts
│   │   ├── errors.ts
│   │   ├── format.ts
│   │   ├── url.ts
│   │   └── validation.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── Dockerfile
├── nginx.conf
├── .dockerignore
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## Como executar

### Pré-requisitos

Para rodar com Docker:

- Docker Desktop ou Docker Engine + Docker Compose v2
- Backend em execução (o Compose sobe a API junto)

Para rodar localmente:

- Node.js 24+ com npm
- Backend em execução em `http://localhost:3000` (veja o README da raiz)

### Com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

O serviço `web` serve o build de produção com Nginx, mas não publica porta no host. O acesso fica em `http://localhost:5173` pelo serviço `ingress`, que encaminha `/` para o frontend e `/api` para `http://api:3000`. O Compose padrão não monta o código como volume: alterações exigem rebuild da imagem.

Para logs do frontend:

```bash
docker compose logs -f web
```

### Instalação local

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

O Vite encaminha requisições `/api/*` para `http://localhost:3000`, removendo o prefixo `/api`. Assim, `GET /api/applications` no navegador chega como `GET /applications` na API.

### Scripts

| Script              | Descrição                                     |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Inicia o Vite em modo desenvolvimento         |
| `npm run build`     | Executa o typecheck e gera o build em `dist/` |
| `npm run typecheck` | Valida os tipos sem gerar arquivos            |
| `npm run preview`   | Serve o build de produção localmente          |

## Variáveis de ambiente

| Variável                | Padrão                  | Descrição                                                    |
| ----------------------- | ----------------------- | ------------------------------------------------------------ |
| `VITE_API_URL`          | `/api`                  | URL base usada pelo cliente Axios                            |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Destino do proxy `/api` apenas no Vite local (`npm run dev`) |

No Docker, o Compose define apenas `VITE_API_URL=/api`; o proxy `/api` é feito pelo ingress e aponta para `http://api:3000`. Em desenvolvimento local, mantenha `VITE_API_URL=/api` para usar o proxy do Vite e evitar CORS.

No build de produção, o `nginx.conf` serve apenas os arquivos estáticos e aplica CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, cache longo para `/assets/` e fallback de SPA para `index.html`. O proxy `/api` fica em `infra/ingress/nginx.conf`.

## Funcionalidades

- Tela de login com usuário e senha, sessão JWT restaurada ao recarregar e logout no header.
- Rotas da aplicação protegidas: sem sessão válida, o usuário é redirecionado para `/login` e volta ao destino original após entrar.
- Abas de status com contadores (Todas, Aguardando, Em andamento, Finalizada e Recusada) acima da listagem.
- Painel com contadores por status e cards com título clicável, link da vaga com hostname, fase atual e arquivos sempre visíveis.
- Busca por título ou fase atual, combinada com o filtro das abas.
- Criação e edição de candidatura com título, link, fase, status e currículo.
- Input file para o currículo: arraste e solte ou selecione o arquivo para preencher nome, MIME e tamanho; a URL pública do documento é exigida para persistir o anexo (a API não recebe binários).
- Anexo manual de múltiplos arquivos e preservação dos existentes na edição.
- Exclusão com aviso crítico e confirmação explícita via checkbox; modo lógico (padrão) ou físico.
- Estados de carregamento (skeleton), erro com ação de retry, confirmação de sucesso e estado vazio.
- Layout responsivo com navegação, cabeçalho e página 404.

## Integração com a API

| Operação        | Método   | Endpoint                            |
| --------------- | -------- | ----------------------------------- |
| Login           | `POST`   | `/auth/login`                       |
| Perfil atual    | `GET`    | `/auth/me`                          |
| Listar          | `GET`    | `/applications`                     |
| Criar           | `POST`   | `/applications`                     |
| Atualizar       | `PATCH`  | `/applications/:id`                 |
| Anexar arquivos | `POST`   | `/applications/:id/files`           |
| Excluir         | `DELETE` | `/applications/:id?mode=soft\|hard` |

Os tipos de resposta e entrada ficam em `src/services/applications.types.ts`. Os rótulos em português dos status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`) também são definidos nesse arquivo.

Exceto `POST /auth/login` e `GET /health`, as chamadas exigem `Authorization: Bearer <token>`. O token é obtido no login e injetado pelo interceptor de requisição em `services/api/client.ts`; respostas `401` limpam a sessão e disparam o redirecionamento para `/login`.

## Validação

```bash
npm run typecheck
npm run build
```

O build gera os arquivos em `dist/`. Em produção, a imagem final usa Nginx (`nginxinc/nginx-unprivileged:alpine`) com o `nginx.conf` do projeto, que faz o fallback de SPA; o proxy `/api` é feito pelo ingress. Ao servir o `dist/` em outro host estático, configure o fallback de rotas desconhecidas para `index.html` e um proxy equivalente para `/api` na borda.
