# Trampo Flow — Frontend

Interface web para acompanhar candidaturas de emprego em um quadro Kanban. Construída com React, Vite e TypeScript, consome a API NestJS do diretório `../backend`.

## Stack

- **React 19** com **TypeScript 6**
- **Vite 8** para desenvolvimento e build
- **Nginx** (imagem unprivileged) para servir o build de produção
- **Tailwind CSS 4** via `@tailwindcss/vite` (configuração CSS-first)
- **React Router 7** com rotas lazy
- **TanStack Query 5** para cache, invalidação e mutations
- **dnd-kit** para arrastar e soltar os cards
- **Axios** em uma camada de serviço isolada
- **Lucide React** para ícones

## Arquitetura

A aplicação é organizada por responsabilidade, com o quadro como tela principal:

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

| Camada                    | Responsabilidade                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `components/ui`           | Design system base: botões, inputs, cards, modais, menu, badges, alertas, skeleton e error boundary |
| `components/auth`         | Rota protegida e tela de carregamento da sessão                                                     |
| `components/layout`       | Estrutura global (navegação, conteúdo, logout e skip link)                                          |
| `components/applications` | Quadro, colunas, cards, formulário e diálogo de exclusão                                            |
| `pages`                   | Composição das telas                                                                                |
| `hooks`                   | Query/mutations, formulário, debounce, disclosure e logout                                          |
| `contexts`                | Sessão autenticada e evento de unauthorized                                                         |
| `services`                | Tipos do domínio e chamadas HTTP isoladas                                                           |
| `lib`                     | Query client, query keys e invalidação centralizada                                                 |
| `config`                  | Configurações derivadas de variáveis de ambiente                                                    |
| `utils`                   | Funções puras de formatação, validação, URLs seguras e download                                     |

### Decisões de design

- **Somente quadro:** a tela inicial é `/candidaturas`; não existe visão de lista nem painel de estatísticas. A rota `/` redireciona para o quadro.
- **Cache centralizado:** `src/lib/query-keys.ts` concentra as chaves e `src/lib/invalidate.ts` invalida o quadro e o detalhe de uma candidatura. Qualquer mutation passa por esse helper.
- **Mutations reutilizáveis:** `useApplicationMutations` é a única porta para criar, atualizar e excluir candidaturas. `ApplicationForm` recebe as ações por props, sem disparar queries escondidas.
- **Otimismo com rollback:** mover um card atualiza ordem e totais das colunas imediatamente; se a API falhar, o quadro anterior é restaurado e um alerta é exibido.
- **Sessão JWT:** o access token fica apenas em memória; o refresh token fica em cookie `httpOnly` + `SameSite=strict`. `refreshAccessToken` deduplica refreshes concorrentes. Logout e `401` limpam o cache de queries.
- **Erros normalizados:** o interceptor converte falhas de rede e respostas da API em `ApiError`. Um retry com erro 500 **não** derruba a sessão.
- **Segurança de URLs:** links externos passam por `safeHttpUrl`. O interceptor não envia o token para outra origem.
- **Exclusão com confirmação explícita:** o diálogo exige checkbox de confirmação e oferece exclusão lógica (padrão) ou física.
- **Acessibilidade:** modais com focus trap e restauração de foco, menus com teclado, skip link, `aria-busy` em botões e respeito a `prefers-reduced-motion`.
- **Tema:** claro, escuro ou sistema, com padrão claro. A preferência fica salva na conta (`PATCH /auth/me/theme`) e uma cópia em `localStorage` evita flash antes do React. Os tokens semânticos ficam em `src/styles/index.css`.
- **Regressão visual:** snapshots Playwright com API mockada em `e2e/visual.spec.ts`; as baselines são geradas em Linux e atualizadas só de forma consciente.

## Estrutura de diretórios

```text
frontend/
├── e2e/
│   ├── __screenshots__/
│   ├── critical-path.spec.ts
│   ├── fixtures.ts
│   └── visual.spec.ts
├── scripts/
│   ├── check-bundle.mjs
│   └── visual-test.sh
├── src/
│   ├── components/
│   │   ├── applications/
│   │   │   ├── ApplicationForm.tsx
│   │   │   ├── ApplicationStatusBadge.tsx
│   │   │   ├── Board.tsx
│   │   │   ├── BoardCard.tsx
│   │   │   ├── BoardColumn.tsx
│   │   │   ├── DeleteApplicationDialog.tsx
│   │   ├── auth/
│   │   ├── brand/
│   │   ├── layout/
│   │   └── ui/
│   ├── config/env.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── auth-context.ts
│   │   └── theme-context.ts
│   ├── hooks/
│   │   ├── useApplication.ts
│   │   ├── useApplicationForm.ts
│   │   ├── useApplicationMutations.ts
│   │   ├── useBoard.ts
│   │   ├── useDebouncedValue.ts
│   │   ├── useDisclosure.ts
│   │   ├── useLogout.ts
│   │   └── useMediaQuery.ts
│   ├── lib/
│   │   ├── invalidate.ts
│   │   ├── query-client.ts
│   │   └── query-keys.ts
│   ├── pages/
│   │   ├── ApplicationDetailPage.tsx
│   │   ├── ApplicationsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── access-token.ts
│   │   │   ├── applications.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── client.ts
│   │   │   ├── errors.ts
│   │   │   └── session.ts
│   │   ├── applications.types.ts
│   │   └── auth.types.ts
│   ├── test/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── Dockerfile
├── nginx.conf
└── vite.config.ts
```

## Como executar

### Com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

O serviço `web` serve o build de produção com Nginx. O acesso fica em `http://localhost:5173` pelo serviço `ingress`, que encaminha `/` para o frontend e `/api` para `http://api:3000`.

### Instalação local

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`. O Vite encaminha `/api/*` para `http://localhost:3000`, removendo o prefixo `/api`.

### Scripts

| Script                       | Descrição                                     |
| ---------------------------- | --------------------------------------------- |
| `npm run dev`                | Inicia o Vite em modo desenvolvimento         |
| `npm run build`              | Executa o typecheck e gera o build em `dist/` |
| `npm run typecheck`          | Valida os tipos sem gerar arquivos            |
| `npm run lint`               | ESLint com regras type-aware                  |
| `npm run test`               | Testes unitários e de componentes (Vitest)    |
| `npm run test:cov`           | Testes com cobertura e thresholds             |
| `npm run test:e2e`           | Playwright (requer stack e credenciais)       |
| `npm run test:visual`        | Regressão visual; usa Docker no macOS         |
| `npm run test:visual:update` | Atualiza as baselines visuais                 |
| `npm run check:bundle`       | Falha se o JS gzip passar de 250 KB           |
| `npm run preview`            | Serve o build de produção localmente          |

## Variáveis de ambiente

| Variável                | Padrão                  | Descrição                                                                                     |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | `/api`                  | URL base usada pelo cliente Axios. Prefira `/api` para manter o cookie de refresh same-origin |
| `VITE_APP_NAME`         | `Trampo Flow`           | Nome exibido na interface                                                                     |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Destino do proxy `/api` apenas no Vite local                                                  |

## Rotas

| Rota                | Tela                             |
| ------------------- | -------------------------------- |
| `/login`            | Login                            |
| `/`                 | Redireciona para `/candidaturas` |
| `/candidaturas`     | Quadro Kanban (tela inicial)     |
| `/candidaturas/:id` | Detalhe, edição e exclusão       |
| `*`                 | 404                              |

## Integração com a API

| Operação       | Método   | Endpoint                            |
| -------------- | -------- | ----------------------------------- |
| Login          | `POST`   | `/auth/login`                       |
| Renovar sessão | `POST`   | `/auth/refresh`                     |
| Logout         | `POST`   | `/auth/logout`                      |
| Perfil atual   | `GET`    | `/auth/me`                          |
| Tema da conta  | `PATCH`  | `/auth/me/theme`                    |
| Quadro         | `GET`    | `/applications/board?search=`       |
| Mover card     | `PATCH`  | `/applications/:id/placement`       |
| Detalhe        | `GET`    | `/applications/:id`                 |
| Criar          | `POST`   | `/applications`                     |
| Atualizar      | `PATCH`  | `/applications/:id`                 |
| Excluir        | `DELETE` | `/applications/:id?mode=soft\|hard` |

## Qualidade

- `npm run lint`, `npm run typecheck` e `npm run test:cov` rodam no CI.
- Cobertura global mínima: 80% statements/lines, 75% branches/functions.
- Playwright cobre login, criação, busca, detalhe e exclusão; o workflow roda em PRs e sob demanda.
- A regressão visual roda em um workflow separado, com snapshots gerados em Linux.
- O CI falha se o bundle JS gzip ultrapassar 250 KB.

## Deploy

O `Dockerfile` usa build multi-stage, instala dependências e compila como usuário `node`, e serve o `dist/` com `nginxinc/nginx-unprivileged:alpine`. O `nginx.conf` aplica CSP, headers de segurança, cache longo para `/assets/` e fallback de SPA para `index.html`. O proxy `/api` fica no ingress.

> O cookie de refresh é `SameSite=strict`. Mantenha frontend e API na mesma origem (via `/api`) ou ajuste a configuração do backend antes de usar `VITE_API_URL` absoluto.
