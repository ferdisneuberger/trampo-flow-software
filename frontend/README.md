# Trampo Flow — Frontend

Web interface for tracking job applications on a Kanban board. Built with React, Vite, and TypeScript, it consumes the NestJS API in the `../backend` directory.

## Stack

- **React 19** with **TypeScript 6**
- **Vite 8** for development and builds
- **Nginx** (unprivileged image) to serve the production build
- **Tailwind CSS 4** via `@tailwindcss/vite` (CSS-first configuration)
- **React Router 7** with lazy routes
- **TanStack Query 5** for caching, invalidation, and mutations
- **dnd-kit** for dragging and dropping cards
- **Axios** in an isolated service layer
- **Lucide React** for icons

## Architecture

The application is organized by responsibility, with the board as the main screen:

```text
Page (pages/ApplicationsPage)
  -> Board (components/applications/Board)
    -> Data hook (hooks/useBoard)
      -> HTTP service (services/api/applications.service)
        -> Axios client (services/api/client)
          -> NestJS API

Page (pages/ApplicationDetailPage)
  -> Mutations hook (hooks/useApplicationMutations)
    -> HTTP service
```

| Layer                     | Responsibility                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/ui`           | Base design system: buttons, inputs, cards, modals, menu, badges, alerts, skeleton, and error boundary |
| `components/auth`         | Protected route and session loading screen                                                             |
| `components/layout`       | Global header (brand, search, theme, account menu/logout, and skip link)                               |
| `components/applications` | Board, columns, cards, form, and deletion dialog                                                       |
| `pages`                   | Screen composition                                                                                     |
| `hooks`                   | Queries/mutations, form, debounce, disclosure, and logout                                              |
| `contexts`                | Authenticated session, theme, and the unauthorized event                                               |
| `services`                | Domain types and isolated HTTP calls                                                                   |
| `lib`                     | Query client, query keys, and centralized invalidation                                                 |
| `config`                  | Settings derived from environment variables                                                            |
| `utils`                   | Pure functions for formatting, validation, safe URLs, and downloads                                    |

### Design decisions

- **Board only:** the home screen is `/candidaturas`; there is no list view or statistics panel. The `/` route redirects to the board.
- **Horizontal header:** brand, search, theme toggle, and account menu live in a single top bar. The initials open the account menu with logout; there is no sidebar.
- **Centralized cache:** `src/lib/query-keys.ts` holds the keys and `src/lib/invalidate.ts` invalidates the board and an application's detail. Every mutation goes through this helper.
- **Reusable mutations:** `useApplicationMutations` is the single entry point for creating, updating, and deleting applications. `ApplicationForm` receives the actions through props, without firing hidden queries.
- **Optimistic updates with rollback:** moving a card updates the order and column totals immediately; if the API fails, the previous board is restored and an alert is shown.
- **JWT session:** the access token lives only in memory; the refresh token lives in an `httpOnly` + `SameSite=strict` cookie. `refreshAccessToken` deduplicates concurrent refreshes. Logout and `401` clear the query cache.
- **Normalized errors:** the interceptor converts network failures and API responses into `ApiError`. A retry that fails with a 500 does **not** end the session.
- **URL safety:** external links go through `safeHttpUrl`. The interceptor never sends the token to another origin.
- **Deletion with explicit confirmation:** the dialog requires a confirmation checkbox and offers soft (default) or hard deletion.
- **Accessibility:** modals with focus trap and focus restoration, keyboard-navigable menus, skip link, `aria-busy` on buttons, and support for `prefers-reduced-motion`.
- **Theme:** light, dark, or system, defaulting to light. The preference is saved to the account (`PATCH /auth/me/theme`), and a copy in `localStorage` prevents a flash before React loads. Semantic tokens live in `src/styles/index.css`.
- **Visual regression:** Playwright snapshots with a mocked API in `e2e/visual.spec.ts`; baselines are generated on Linux and only updated deliberately.

## Directory structure

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
│   │   └── useLogout.ts
│   ├── lib/
│   │   ├── invalidate.ts
│   │   ├── query-client.ts
│   │   └── query-keys.ts
│   ├── pages/
│   │   ├── ApplicationDetailPage.tsx
│   │   ├── ApplicationsPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── TermsPage.tsx
│   │   └── VerifyEmailPage.tsx
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

## Running

### With Docker

From the project root:

```bash
docker compose up -d --build
```

The `web` service serves the production build with Nginx. Access is at `http://localhost:5173` through the `ingress` service, which forwards `/` to the frontend and `/api` to `http://api:3000`.

### Local installation

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The application is available at `http://localhost:5173`. Vite forwards `/api/*` to `http://localhost:3000`, stripping the `/api` prefix.

### Scripts

| Script                       | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `npm run dev`                | Starts Vite in development mode               |
| `npm run build`              | Runs the typecheck and builds to `dist/`      |
| `npm run typecheck`          | Type-checks without emitting files            |
| `npm run lint`               | ESLint with type-aware rules                  |
| `npm run test`               | Unit and component tests (Vitest)             |
| `npm run test:cov`           | Tests with coverage and thresholds            |
| `npm run test:e2e`           | Playwright (requires a stack and credentials) |
| `npm run test:visual`        | Visual regression; uses Docker on macOS       |
| `npm run test:visual:update` | Updates the visual baselines                  |
| `npm run check:bundle`       | Fails if the gzipped JS exceeds 250 KB        |
| `npm run preview`            | Serves the production build locally           |

## Environment variables

| Variable                | Default                 | Description                                                                             |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | `/api`                  | Base URL used by the Axios client. Prefer `/api` to keep the refresh cookie same-origin |
| `VITE_APP_NAME`         | `Trampo Flow`           | Name displayed in the interface                                                         |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | `/api` proxy target, only for local Vite                                                |
| `VITE_GOOGLE_CLIENT_ID` | —                       | Google Client ID used by the Google sign-in button (read at build time)                 |

## Routes

| Route               | Screen                        |
| ------------------- | ----------------------------- |
| `/login`            | Login                         |
| `/cadastro`         | Sign-up                       |
| `/verificar-email`  | Email verification            |
| `/esqueci-senha`    | Forgot password               |
| `/redefinir-senha`  | Password reset                |
| `/termos`           | Terms of use                  |
| `/`                 | Redirects to `/candidaturas`  |
| `/candidaturas`     | Kanban board (home screen)    |
| `/candidaturas/:id` | Detail, editing, and deletion |
| `*`                 | 404                           |

## API integration

| Operation           | Method   | Endpoint                            |
| ------------------- | -------- | ----------------------------------- |
| Login               | `POST`   | `/auth/login`                       |
| Google sign-in      | `POST`   | `/auth/google`                      |
| Sign-up             | `POST`   | `/auth/register`                    |
| Confirm email       | `POST`   | `/auth/verification/confirm`        |
| Resend verification | `POST`   | `/auth/verification/resend`         |
| Forgot password     | `POST`   | `/auth/password/forgot`             |
| Reset password      | `POST`   | `/auth/password/reset`              |
| Refresh session     | `POST`   | `/auth/refresh`                     |
| Logout              | `POST`   | `/auth/logout`                      |
| Current profile     | `GET`    | `/auth/me`                          |
| Account theme       | `PATCH`  | `/auth/me/theme`                    |
| Board               | `GET`    | `/applications/board?search=`       |
| Move card           | `PATCH`  | `/applications/:id/placement`       |
| Detail              | `GET`    | `/applications/:id`                 |
| Create              | `POST`   | `/applications`                     |
| Update              | `PATCH`  | `/applications/:id`                 |
| Delete              | `DELETE` | `/applications/:id?mode=soft\|hard` |

## Quality

- `npm run lint`, `npm run typecheck`, and `npm run test:cov` run in CI.
- Minimum global coverage: 80% statements/lines, 75% branches/functions.
- Playwright covers login, creation, search, detail, and deletion; the workflow runs on PRs and on demand.
- Visual regression runs in a separate workflow, with snapshots generated on Linux.
- CI fails if the gzipped JS bundle exceeds 250 KB.

## Deployment

The `Dockerfile` uses a multi-stage build, installs dependencies and compiles as the `node` user, and serves `dist/` with `nginxinc/nginx-unprivileged:alpine`. `nginx.conf` applies a CSP, security headers, long-lived caching for `/assets/`, and an SPA fallback to `index.html`. The `/api` proxy lives in the ingress.

> The refresh cookie is `SameSite=strict`. Keep the frontend and the API on the same origin (via `/api`) or adjust the backend configuration before using an absolute `VITE_API_URL`.
