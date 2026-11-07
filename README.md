# Trampo Flow

[![CI](https://github.com/ferdisneuberger/trampo-flow-software/actions/workflows/ci.yml/badge.svg)](https://github.com/ferdisneuberger/trampo-flow-software/actions/workflows/ci.yml)

Full-stack application for tracking job applications. The backend is a Node.js API built with NestJS, Fastify, Prisma, and PostgreSQL, organized in layers following DDD and SOLID principles. The frontend is a React SPA built with Vite, TypeScript, and Tailwind CSS, structured into components, hooks, and services.

## Highlights of 3.0

- Per-user applications, with company and company website.
- Kanban board with drag and drop and persisted manual ordering.
- Server-side search, with the Kanban board as the home screen.
- Horizontal header with search, theme toggle, and an account menu with logout.
- Light, dark, and system themes, with light as the default and the preference
  saved per user.
- Trampo Brasil visual identity across the app and transactional emails.
- Session with a short-lived access token in memory and a refresh token in an
  `HttpOnly` cookie.
- Application detail page with editing and deletion.
- Playwright visual regression with Linux baselines.

**Current version:** 3.0.0. The full history is in [CHANGELOG.md](CHANGELOG.md).

## Stack

- **Node.js 24** and **TypeScript**
- **NestJS 12** with **Fastify** (`@nestjs/platform-fastify`)
- **Prisma ORM 6** for PostgreSQL persistence
- **PostgreSQL 16** via Docker Compose
- **class-validator** / **class-transformer** for DTO validation
- **Vitest** for unit tests with in-memory repositories
- **React 19**, **Vite 8**, **TypeScript 6**, and **Tailwind CSS 4** on the frontend
- **Lucide React**, **Axios**, **React Router 7**, **TanStack Query**, and **dnd-kit** in the web interface
- **Nginx** at the edge (proxying `/` and `/api`) and to serve the frontend production build

## Architecture

The backend is organized in layers, with the applications context in `applications`.

| Layer            | Responsibility                                                                       | Allowed dependencies                                                                   |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `domain`         | Entities, business rules, enums, domain errors, and repository interfaces            | No framework, HTTP, or database dependencies                                           |
| `application`    | Use cases, input DTOs, and application errors                                        | `domain`; Nest's `@Injectable` for DI and `class-validator` in DTOs, no HTTP or Prisma |
| `infrastructure` | Controllers, Nest modules, Prisma persistence, mappers, presenters, and HTTP filters | `application` and `domain`                                                             |

### Request flow

```text
HTTP (Fastify)
  -> Controller
    -> Use Case
      -> Repository (interface in the domain)
        <- PrismaApplicationRepository (implementation in the infrastructure)
          -> PostgreSQL
```

The controller does not know about Prisma. The use case knows neither HTTP nor the database. The domain entity does not know about NestJS.

### Dependency injection

The `ApplicationRepository` interface is an abstract class used as a NestJS token. The feature module binds it to the concrete implementation:

```ts
{
  provide: ApplicationRepository,
  useClass: PrismaApplicationRepository,
}
```

This way, use cases depend on the abstraction and the infrastructure chooses the implementation. This applies the Dependency Inversion Principle (DIP) and makes it possible to replace Prisma with another adapter without changing the business rules.

### Application entry point

`backend/src/main.ts` configures:

- `FastifyAdapter` as the NestJS HTTP driver, without trusting proxy headers
- A global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`
- A global `DomainExceptionFilter` that converts domain/application errors into HTTP responses
- A global `JwtAuthGuard`, with public routes annotated by `@Public()`
- `Cache-Control: no-store` and security headers on every response
- CORS and shutdown hooks
- Port via `ConfigService`, bound to `0.0.0.0`

## Domain model

### Application (`Application`)

| Field          | Type           | Rule                                                   |
| -------------- | -------------- | ------------------------------------------------------ |
| `id`           | UUID           | Generated on creation                                  |
| `title`        | string         | Required, up to 120 characters                         |
| `link`         | string         | Required, valid HTTP/HTTPS URL, up to 2048 characters  |
| `company`      | string         | Required, 2 to 120 characters                          |
| `companyUrl`   | string or null | Optional, valid HTTP/HTTPS URL, up to 2048 characters  |
| `position`     | integer        | Manual order within the board column                   |
| `status`       | enum           | One of the fixed statuses below; defaults to `PENDING` |
| `currentPhase` | string         | Required, free text, up to 120 characters              |
| `createdAt`    | date           | Set on creation                                        |
| `updatedAt`    | date           | Updated on every change                                |
| `deletedAt`    | date or null   | Set on soft deletion                                   |

### Fixed statuses

| API value     | UI label (pt-BR) | Meaning     |
| ------------- | ---------------- | ----------- |
| `PENDING`     | Aguardando       | Pending     |
| `IN_PROGRESS` | Em Andamento     | In progress |
| `COMPLETED`   | Finalizada       | Completed   |
| `REJECTED`    | Recusada         | Rejected    |

The statuses are a closed set. The API returns the enum value, and the interface displays the Portuguese label.

### Soft and hard deletion

- `DELETE /applications/:id` or `DELETE /applications/:id?mode=soft` performs a soft delete: it sets `deletedAt` and keeps the record.
- `DELETE /applications/:id?mode=hard` permanently removes the application.
- Soft-deleted applications do not appear in `GET /applications`.
- Editing or soft-deleting an already deleted application returns `409` with `APPLICATION_ALREADY_DELETED`.
- A soft-deleted application can still be permanently removed with `mode=hard`.

## Prerequisites

To run everything with Docker:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Docker Compose v2
- A modern browser to access the interface
- Ports `5173`, `8080`, and `5432` free, or different values set in `.env` (`WEB_PORT` is the ingress public port)

To run the API and/or the frontend outside Docker:

- Node.js 24+ with npm
- PostgreSQL 16, local or in a container

Check Docker:

```bash
docker --version
docker compose version
```

## Starting the environment

From the project root:

```bash
# Required: set JWT_SECRET and AUTH_TOKEN_SECRET
cp .env.example .env

# Start PostgreSQL, API, frontend, and ingress
docker compose up --build

# Or in the background
docker compose up -d --build
```

On startup, the API container runs `prisma migrate deploy` before starting the compiled build (`node dist/main`). Existing migrations in `backend/prisma/migrations` are applied automatically.

The `ingress` service is the only public entry point on the host (`127.0.0.1:${WEB_PORT:-5173}`). It forwards `/api/*` to `http://api:3000`, stripping the `/api` prefix, and everything else to `http://web:5173`. The `web` container only serves the static production build with Nginx and an SPA fallback. The API and the frontend do not publish ports on the host. The default Compose setup does not mount the code as a volume; changes require rebuilding the image.

> The `20261023230000_applications` migration replaces the old `job_applications` table with the `applications` table. History is preserved.

### Services

| Service  | URL                       | Notes                                                                                                        |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Frontend | http://localhost:5173     | Single entry point through the ingress; production build served by Nginx                                     |
| API      | http://localhost:5173/api | Through the ingress; `GET /api/health` and `POST /api/auth/login` are public; all other routes require a JWT |
| Postgres | `localhost:5432`          | Access from an external SQL client on `127.0.0.1`                                                            |

The API does not publish port `3000` and the `web` container does not publish `5173`; the only service with a port published for external access is `ingress` (`127.0.0.1:${WEB_PORT:-5173}`). The API is only reachable from the Compose network or through the ingress.

These are the defaults from `docker-compose.yml`. If you changed `.env`, use the corresponding values.

### Authentication

The API uses JWTs signed with HS256. Users live in the PostgreSQL `users` table, with passwords derived using **scrypt** (N=16384, r=8, p=1, 16-byte salt, and 64-byte key). The hash has the format `scrypt$N$r$p$salt$key`, so raising the cost later does not invalidate existing passwords.

| Variable                       | Required | Description                                                 |
| ------------------------------ | -------- | ----------------------------------------------------------- |
| `JWT_SECRET`                   | yes      | HMAC secret with at least 32 characters                     |
| `JWT_EXPIRES_IN`               | no       | Access token lifetime (`5m`, `30m`, `8h`); defaults to `5m` |
| `REFRESH_TOKEN_TTL_HOURS`      | no       | Refresh token lifetime in hours; defaults to `12`           |
| `REFRESH_TOKEN_GRACE_SECONDS`  | no       | Reuse tolerance across tabs; defaults to `10`               |
| `LOGIN_MAX_ATTEMPTS`           | no       | Consecutive failures before lockout; defaults to `10`       |
| `LOGIN_WINDOW_SECONDS`         | no       | Window and lockout duration; defaults to `120`              |
| `AUTH_TOKEN_SECRET`            | yes      | HMAC secret for verification tokens (32+ characters)        |
| `APP_BASE_URL`                 | no       | Public URL used in email links                              |
| `REGISTRATION_ENABLED`         | no       | Turns public sign-up on/off; defaults to `false`            |
| `EMAIL_VERIFICATION_TTL_HOURS` | no       | Verification code lifetime; defaults to `12`                |
| `VERIFICATION_RESEND_SECONDS`  | no       | Resend cooldown; defaults to `120`                          |
| `PASSWORD_RESET_TTL_MINUTES`   | no       | Password reset link lifetime; defaults to `15`              |
| `GOOGLE_CLIENT_ID`             | no       | Public Google Client ID used to validate the ID token       |
| `API_KEY_DELETE`               | no       | Key for the administrative deletion route (testing only)    |
| `TERMS_VERSION`                | no       | Terms version accepted on sign-up; defaults to `2026-11`    |
| `SMTP_HOST`                    | no       | SMTP server; defaults to `smtp.gmail.com`                   |
| `SMTP_PORT`                    | no       | SMTP port; defaults to `587`                                |
| `SMTP_SECURE`                  | no       | Direct TLS; defaults to `false` (STARTTLS)                  |
| `SMTP_USER`                    | no       | SMTP account                                                |
| `SMTP_PASS`                    | no       | Gmail App Password                                          |
| `MAIL_FROM`                    | no       | Email sender address                                        |
| `MAIL_FROM_NAME`               | no       | Sender display name; defaults to `Trampo Flow`              |
| `MAILPIT_PORT`                 | no       | Local Mailpit port; defaults to `8025`                      |

Users are no longer provisioned through environment variables. Create accounts through public sign-up (with `REGISTRATION_ENABLED=true`) or directly in the database, and manage passwords through the recovery flow. Passwords are never compared in plain text.

The password policy requires at least 8 characters, including at least one uppercase letter, one number, and one special character (symbol or punctuation). The sign-up form shows the requirements in real time as the password is typed and validates the confirmation before submitting.

Generate a strong secret with `openssl rand -hex 32` and keep `.env` out of Git. Restrict the file to your user with `chmod 600 .env`. Login is done at `POST /auth/login` and returns an `accessToken`; send it on the other routes as `Authorization: Bearer <token>`.

```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"person@example.com","password":"your-password"}'
```

The token `sub` is the user **id** (UUID). The guard validates the signature and confirms that the user still exists in the database on every request, so deleting a user immediately invalidates their tokens.

#### Sign-up and email verification

Public sign-up is controlled by `REGISTRATION_ENABLED`. When enabled, `POST /auth/register` creates the account with an empty `email_verified_at` and sends a 6-character code in the `ADK-7YP` format. The code is stored only as HMAC-SHA256, expires in 12 hours, and is consumed by `POST /auth/verification/confirm`. After confirmation, a second email notifies the user that the account is verified.

Sign-up requires `firstName` and `lastName`, each up to 30 characters. The board uses the first name to greet the user.

```bash
curl -X POST http://localhost:5173/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"person@example.com","firstName":"Fernando","lastName":"Neuberger","password":"Super-secret-password1!","termsAccepted":true}'

curl -X POST http://localhost:5173/api/auth/verification/confirm \
  -H 'content-type: application/json' \
  -d '{"token":"ADK-7YP"}'
```

Unverified users can sign in, but cannot create applications yet. This is enforced in the backend with `403 EMAIL_NOT_VERIFIED` and reinforced in the frontend. In development, Mailpit captures emails at `http://localhost:8025`; to use real Gmail, set `SMTP_HOST=smtp.gmail.com` and the App Password in `SMTP_PASS`.

#### Administrative testing route

`DELETE /admin/users/:email` deletes a user and, by cascade, their applications, verification tokens, and refresh tokens. The route is only enabled when `API_KEY_DELETE` is set and requires the `x-api-key` header. Without the variable, it responds `403 ADMIN_ROUTE_DISABLED`; with a wrong key, `401 INVALID_API_KEY`.

Keep `API_KEY_DELETE` empty in production. For local testing, use a strong key and remove it when you are done.

Selective backup and restore of the owner account:

```bash
DATABASE_URL='postgresql://trampo:trampo_dev@127.0.0.1:5432/trampo_flow' \
  OWNER_EMAIL='fernandoftneuberger@gmail.com' \
  npm --prefix backend run auth:backup-owner

DATABASE_URL='postgresql://trampo:trampo_dev@127.0.0.1:5432/trampo_flow' \
  npm --prefix backend run auth:restore-owner
```

The JSON backup is stored in `backups/` and is not committed.

#### Google sign-in

`POST /auth/google` receives the `credential` (ID token) issued by Google Identity Services. The backend validates the signature, issuer, audience, expiration, and `email_verified` with `google-auth-library`. No Client Secret is needed for this flow.

- New account: created already verified, without a password, and with the terms accepted.
- Existing verified account with the same email: gets linked through `google_id`.
- Existing unverified account with the same email: returns `409 GOOGLE_ACCOUNT_CONFLICT`; no link is created.

In Google Cloud, register the JavaScript origins `http://localhost:5173`, `http://127.0.0.1:5173`, and the production domain. The backend reads `GOOGLE_CLIENT_ID` and the frontend uses `VITE_GOOGLE_CLIENT_ID` at build time.

```bash
curl -X POST http://localhost:5173/api/auth/google \
  -H 'content-type: application/json' \
  -d '{"credential":"google-id-token"}'
```

#### Password recovery

`POST /auth/password/forgot` always responds generically. If an account with a password exists, a high-entropy link is sent and expires in 15 minutes. The link opens `/redefinir-senha`, where the user chooses a new password. On completion, the token is consumed and **all sessions** for the account are revoked.

```bash
curl -X POST http://localhost:5173/api/auth/password/forgot \
  -H 'content-type: application/json' \
  -d '{"email":"person@example.com"}'

curl -X POST http://localhost:5173/api/auth/password/reset \
  -H 'content-type: application/json' \
  -d '{"token":"token-from-email","password":"new-secure-password"}'
```

The `/applications` routes only operate on the token user's applications. An id belonging to another account responds `404`, not `403`, so the record's existence is not revealed.

#### Session and refresh token

Login returns a short-lived **access token** and stores an opaque **refresh token** in an `HttpOnly` cookie (not accessible to JavaScript), `SameSite=Strict`, and `Secure` in production. The refresh token is valid for 12 hours and is stored in the database only as a SHA-256 hash.

```http
POST /auth/refresh   → new access token + rotated cookie
POST /auth/logout    → revokes the family and clears the cookie
```

Each refresh rotates the token: the previous one is revoked and points to its replacement. If an already revoked token is presented again outside a 10-second grace window, the **entire family** is revoked — this is reuse detection. The window exists so that two tabs refreshing at the same time do not end the session.

The theme preference is saved per user via `PATCH /auth/me/theme` (`light`, `dark`, or `system`). The default is `light`; the frontend keeps a copy in `localStorage` only to apply the theme before React loads and avoid a flash.

`POST /auth/login`, `POST /auth/google`, `POST /auth/register`, `POST /auth/verification/confirm`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `POST /auth/refresh`, `POST /auth/logout`, and `GET /health` are public. `POST /auth/verification/resend` requires a session. All `/applications` routes, `GET /auth/me`, and `PATCH /auth/me/theme` go through the global guard. The frontend keeps the access token only in memory, restores the session with `POST /auth/refresh` + `GET /auth/me`, and clears the query cache on any `401` response. Logout calls `POST /auth/logout`, revokes the refresh token family, and clears the cookie. Invalid credentials always receive `401` with the same message, and the hash runs even when the user does not exist, so registered emails are not revealed.

## Frontend

The web interface lives in `frontend/` and consumes the API through a service layer using Axios. The application uses React Router, Tailwind CSS 4 (CSS-first configuration), and reusable base components.

### Architecture

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

- `components/ui`: base design system (buttons, inputs, cards, modals, menu, badges, alerts, skeletons, and error boundary).
- `components/layout`: global shell with navigation, skip link, logout, and a per-route error boundary.
- `components/applications`: board, columns, cards, form, and deletion dialog.
- `hooks`: queries/mutations (`useBoard`, `useApplicationMutations`), form (`useApplicationForm`), debounce, disclosure, and logout.
- `contexts`: authenticated session and the `401` event.
- `lib`: query client, query keys, and centralized invalidation.
- `services`: domain types, Axios client, error normalization, deduplicated refresh, and endpoints.
- `pages`: screen composition and flow orchestration.

The home screen is `/candidaturas`; there is no list view or statistics panel. The `/` route redirects to the board.

### Run with Docker

From the project root:

```bash
docker compose up -d --build
```

The `web` service serves the production build with Nginx but does not publish a port on the host. Access is at `http://localhost:5173` through the `ingress` service, which forwards `/api` to `http://api:3000` inside the Compose network. For local development outside Docker, see [Run locally](#run-locally).

To follow the logs:

```bash
docker compose logs -f web
```

### Run locally

With the API running at `http://localhost:3000`:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The interface is available at `http://localhost:5173`. Vite forwards `/api/*` to the backend and strips the `/api` prefix, so the client uses `VITE_API_URL=/api` without CORS issues in development. The production build is static, and the equivalent proxy lives in `infra/ingress/nginx.conf` when the environment runs through Compose.

### Tests

The frontend uses **Vitest** with **Testing Library** and the `jsdom` environment. The tests cover pages, components, contexts, hooks, API services, and utilities.

```bash
cd frontend

npm test        # run once
npm run test:watch
npm run test:cov
```

Coverage is measured across `src/**` with a global threshold of 80% statements/lines and 75% branches/functions, plus stricter thresholds for `src/utils/**` (95%) and `src/hooks/useApplicationForm.ts` (75%).

### End-to-end tests

E2E runs with **Playwright** against an isolated stack, never against your Compose environment:

```bash
npm run test:e2e:local
```

The script starts a separate Compose project (`trampo-e2e`) at `http://127.0.0.1:6173`, with its own database and SMTP pointing to Mailpit, and tears everything down at the end. The suite covers:

- login accessibility (axe, WCAG A/AA);
- the critical flow (login, session after reload, root redirect, create, search, detail, and delete), using an already verified user created by `backend/scripts/create-e2e-user.mjs`, with no email involved;
- public sign-up with verification, the only test that depends on email; the code is read from Mailpit.

Without `E2E_BASE_URL`, all tests are skipped. Do not point E2E at the development stack: it uses the real SMTP and the real database, and the sign-up test would send real emails. The E2E workflow runs on pull requests touching frontend/backend/infra, on demand (`workflow_dispatch`), and on a nightly schedule.

### Visual regression

UI snapshots live in `frontend/e2e/__screenshots__` and are generated on Linux to match CI. The command below uses Docker automatically on macOS:

```bash
cd frontend
npm run test:visual
```

To deliberately update the baselines:

```bash
npm run test:visual:update
```

The `Visual` workflow runs on PRs touching `frontend/**` and publishes the diffs when it fails. The existing E2E flow was not changed.

### Features

- Kanban board as the home screen (`/candidaturas`), with columns per status and drag and drop.
- Light, dark, or automatic theme, with the preference saved to the account and the browser. The default is light.
- Cards with a clickable title, company, current phase, and date.
- Server-side search by title, company, or phase; searching temporarily disables dragging.
- Creating and editing applications with title, link, phase, and status.
- Soft (default) or hard deletion, with a critical warning and explicit checkbox confirmation.
- Loading states, errors with retry, success confirmation, 404, and error boundary.
- Public sign-up with email verification by code, terms of use, and creation blocked until confirmation.
- Google sign-in for verified accounts.
- Session with the access token in memory, deduplicated refresh, server-side logout, and cache clearing on `401`.

See [`frontend/README.md`](frontend/README.md) for the full structure and architecture details.

## API

> All `/applications` routes require `Authorization: Bearer <token>`. Get the token from `POST /auth/login`. `GET /health`, `POST /auth/login`, `POST /auth/google`, `POST /auth/register`, `POST /auth/verification/confirm`, `POST /auth/password/forgot`, and `POST /auth/password/reset` are public. In the examples below, replace `<token>` with the `accessToken` returned by login.
>
> The API is accessed through the local ingress entry point at `http://localhost:5173/api`; the `/api` prefix is stripped before reaching the API. If the API is running outside Docker at `http://localhost:3000`, remove the `/api` prefix from the URLs.
>
> Interactive documentation (OpenAPI) is available at `/docs`: `http://localhost:5173/docs` through the ingress, or `http://localhost:3000/docs` when running outside Docker. The specification JSON is at `/docs-json`.

### Health check

```bash
curl http://localhost:5173/api/health
```

```json
{ "status": "ok", "database": "up" }
```

If the database is unavailable, the response is `503` with `{ "status": "degraded", "database": "down" }`.

### Create an application

```bash
curl -X POST http://localhost:5173/api/applications \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Backend Engineer",
    "link": "https://example.com/jobs/backend-engineer",
    "company": "Nubank",
    "companyUrl": "https://nubank.com.br",
    "currentPhase": "Screening"
  }'
```

Accepted fields:

| Field          | Type   | Required | Rule                                                                        |
| -------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `title`        | string | yes      | up to 120 characters                                                        |
| `link`         | string | yes      | valid HTTP/HTTPS URL, up to 2048 characters                                 |
| `company`      | string | yes      | 2 to 120 characters                                                         |
| `companyUrl`   | string | no       | valid HTTP/HTTPS URL, up to 2048 characters                                 |
| `currentPhase` | string | yes      | up to 120 characters                                                        |
| `status`       | enum   | no       | `PENDING`, `IN_PROGRESS`, `COMPLETED`, or `REJECTED`; defaults to `PENDING` |

### List applications

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

| Parameter | Default  | Rule                                                                        |
| --------- | -------- | --------------------------------------------------------------------------- |
| `search`  | —        | Case-insensitive search in `title`, `company`, and `currentPhase`           |
| `status`  | —        | `PENDING`, `IN_PROGRESS`, `COMPLETED`, or `REJECTED`                        |
| `limit`   | `25`     | Between 1 and 100                                                           |
| `sort`    | `recent` | `recent` (newest created) or `stale` (oldest updated)                       |
| `cursor`  | —        | Use the `nextCursor` from the previous page. An invalid cursor responds 400 |

Pagination is keyset-based (`createdAt` + `id`, or `updatedAt` + `id` for `stale`), so two consecutive pages never repeat or skip items. Soft-deleted applications are excluded.

### Status counters

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

The counters include all of the user's active applications and ignore search filters.

### Move on the board

```bash
curl -X PATCH http://localhost:5173/api/applications/<id>/placement \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{ "status": "IN_PROGRESS", "beforeId": "<id-above>", "afterId": "<id-below>" }'
```

| Field      | Required | Rule                                              |
| ---------- | -------- | ------------------------------------------------- |
| `status`   | no       | Target status; keeps the current one when omitted |
| `beforeId` | no       | Application placed immediately above              |
| `afterId`  | no       | Application placed immediately below              |

Positions are calculated in multiples of 1000. When the gap between two neighbors reaches
1, the column is reindexed in the same transaction. A neighbor with a different status responds `400`
(`INVALID_PLACEMENT`). New applications go to the end of the column.

### Update an application

```bash
curl -X PATCH http://localhost:5173/api/applications/<id> \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Staff Engineer",
    "currentPhase": "HR interview",
    "status": "IN_PROGRESS"
  }'
```

All fields are optional, but at least one must be sent. Accepted fields: `title`, `link`, `currentPhase`, and `status`.

### Delete an application

```bash
# Soft delete (default)
curl -X DELETE 'http://localhost:5173/api/applications/<id>' \
  -H 'Authorization: Bearer <token>'

# Explicit soft delete
curl -X DELETE 'http://localhost:5173/api/applications/<id>?mode=soft' \
  -H 'Authorization: Bearer <token>'

# Hard delete
curl -X DELETE 'http://localhost:5173/api/applications/<id>?mode=hard' \
  -H 'Authorization: Bearer <token>'
```

Successful deletions return `204 No Content`.

### Error format

Domain and application errors:

```json
{
  "error": "INVALID_LINK",
  "message": "Link must be a valid HTTP or HTTPS URL."
}
```

| Situation                          | HTTP  | Code                                         |
| ---------------------------------- | ----- | -------------------------------------------- |
| Missing, invalid, or expired token | `401` | Default guard message                        |
| Too many login attempts            | `429` | `TOO_MANY_ATTEMPTS`                          |
| Resource not found                 | `404` | `APPLICATION_NOT_FOUND`                      |
| Application already deleted        | `409` | `APPLICATION_ALREADY_DELETED`                |
| Invalid deletion mode              | `400` | `INVALID_DELETE_MODE`                        |
| Domain validation                  | `400` | Specific code, such as `TITLE_REQUIRED`      |
| DTO validation                     | `400` | Default NestJS format with `statusCode: 400` |

## Tests

Unit tests use **Vitest** and an in-memory repository that clones entities to isolate each operation. No database is needed to run them.

```bash
cd backend

npm test             # run all tests once
npm run test:watch   # watch mode
npm run test:cov     # coverage with V8
npm run test:typecheck # typecheck sources and tests
```

### Postgres integration tests

The Prisma repository is tested against a real PostgreSQL, with migrations applied and `TRUNCATE` between cases. These tests are skipped when `TEST_DATABASE_URL` is not set, so `npm test` still works without a database.

```bash
# create a separate database whose name ends in _test
docker compose exec postgres createdb -U trampo trampo_flow_test

cd backend
TEST_DATABASE_URL=postgresql://trampo:trampo_dev@127.0.0.1:5432/trampo_flow_test \
  npm run test:cov
```

The test helper rejects any URL whose database name does not end in `_test`, and rejects a URL equal to `DATABASE_URL`, so a value copied by mistake cannot wipe development data.

`TEST_DATABASE_URL` is also what enables the coverage threshold: without it, the skipped tests would skew the average, so the threshold is ignored.

Covered scenarios:

- Creation with the default status and an explicit status.
- Validation of title, link, phase, and status.
- Updating title, link, current phase, and every fixed status.
- Partial updates and `updatedAt` updates.
- Rejection of updates with no fields, of nonexistent applications, and of deleted applications.
- Default soft delete, explicit soft delete, hard delete, and purging an already deleted record.
- Rejection of a second soft delete, an invalid mode, and a nonexistent application.
- Listing only active applications.
- `Application` entity rules.
- User authentication, JWT issuing/validation, and rejection of invalid tokens.
- Global login lockout after consecutive failures, window expiration, and reset on success.
- Global guard: public routes, preflight, missing token, invalid scheme, and another user's token.
- Prisma ↔ domain mapper: round-trip, every status, and `deletedAt`.
- HTTP presenter: fields and ISO dates.
- Exception filter: mapping domain errors to 400, 404, and 409.
- Controllers: field forwarding and deletion mode.
- Prisma repository against Postgres: persistence, filtering deleted records, ordering, and cascading deletion.

Test structure:

```text
backend/test/
├── application/
│   ├── authenticate-user.use-case.spec.ts
│   ├── create-application.use-case.spec.ts
│   ├── delete-application.use-case.spec.ts
│   ├── get-user-profile.use-case.spec.ts
│   ├── list-applications.use-case.spec.ts
│   └── update-application.use-case.spec.ts
├── domain/
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
│   └── user.mapper.spec.ts
├── factories/application.factory.ts
├── helpers/expect-domain-error.ts
├── helpers/test-database.ts
├── repositories/in-memory-application.repository.ts
└── repositories/in-memory-user.repository.ts
```

## Project structure

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
│   │   │       │   └── application.entity.ts
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

## Local API development

With the Compose PostgreSQL running:

```bash
docker compose up -d postgres

cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

`backend/.env.example` points to `localhost:5432`. The `prestart:dev` script runs `prisma generate` before starting watch mode.

Scripts available in `backend/package.json`:

| Script                    | Description                               |
| ------------------------- | ----------------------------------------- |
| `npm run start:dev`       | Starts in watch mode                      |
| `npm run build`           | Compiles to `dist/`                       |
| `npm run start:prod`      | Runs the compiled build                   |
| `npm test`                | Runs the unit tests                       |
| `npm run test:cov`        | Runs the tests with coverage              |
| `npm run test:typecheck`  | Type-checks sources and tests             |
| `npm run prisma:generate` | Generates the Prisma Client               |
| `npm run prisma:migrate`  | Creates/applies migrations in development |
| `npm run prisma:studio`   | Opens Prisma Studio                       |

## Environment variables

### Compose (root)

| Variable            | Default       | Description                                       |
| ------------------- | ------------- | ------------------------------------------------- |
| `POSTGRES_USER`     | `trampo`      | PostgreSQL user                                   |
| `POSTGRES_PASSWORD` | `trampo_dev`  | PostgreSQL password                               |
| `POSTGRES_DB`       | `trampo_flow` | Database created on startup                       |
| `POSTGRES_PORT`     | `5432`        | Postgres port on `127.0.0.1`                      |
| `WEB_PORT`          | `5173`        | Local ingress port on `127.0.0.1`                 |
| `CORS_ORIGINS`      | local origins | Origins allowed by the API CORS (comma-separated) |

The `JWT_SECRET`, `JWT_EXPIRES_IN`, `LOGIN_MAX_ATTEMPTS`, and `LOGIN_WINDOW_SECONDS` variables also live in the root `.env` and are passed to the `api` service; see [Authentication](#authentication).

### Backend (`backend/.env`)

| Variable       | Default                                                     | Description                                   |
| -------------- | ----------------------------------------------------------- | --------------------------------------------- |
| `NODE_ENV`     | `development`                                               | Runtime environment                           |
| `PORT`         | `3000`                                                      | Internal API port                             |
| `DATABASE_URL` | `postgresql://trampo:trampo_dev@localhost:5432/trampo_flow` | Connection used locally and by the Prisma CLI |
| `CORS_ORIGINS` | local origins                                               | Allowed CORS origins (comma-separated)        |

Authentication variables are also read from the environment; see [Authentication](#authentication).

In Docker, Compose sets `DATABASE_URL` to the `postgres` host and overrides the `.env` value.

### Frontend (`frontend/.env`)

| Variable                | Default                 | Description                                              |
| ----------------------- | ----------------------- | -------------------------------------------------------- |
| `VITE_API_URL`          | `/api`                  | Base URL used by the Axios client                        |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | `/api` proxy target, only for local Vite (`npm run dev`) |

In Compose, the `/api` proxy is defined in `infra/ingress/nginx.conf` and points to `http://api:3000` inside the Compose network; Vite does not proxy in that environment. The production `frontend/nginx.conf` only serves static files. Keep `VITE_API_URL=/api`. If you deploy the frontend separately from the API, set `VITE_API_URL` to the absolute API URL and adjust CORS in the backend.

## Useful commands

```bash
# Container status
docker compose ps

# API logs
docker compose logs -f api

# Frontend logs
docker compose logs -f web

# Ingress logs
docker compose logs -f ingress

# Rebuild images after changing package.json
docker compose build api web

# Validate the ingress config and recreate it after changing infra/ingress/nginx.conf
docker compose exec ingress nginx -t
docker compose up -d --force-recreate ingress

# Create a new migration locally
cd backend
npx prisma migrate dev --name migration_name
cd ..

# Regenerate the Prisma Client
docker compose exec api npx prisma generate

# Stop the containers (keeps the data)
docker compose down

# Stop and remove the volumes (deletes the database)
docker compose down -v
```

## Troubleshooting

**Port already in use**

Change `WEB_PORT` or `POSTGRES_PORT` in `.env` and start again with `docker compose up -d`. The API and the frontend do not publish ports on the host; only the ingress uses `WEB_PORT`.

**API does not become healthy**

```bash
docker compose logs postgres
docker compose logs api
```

Check that Postgres is healthy and that `DATABASE_URL` points to the correct host.

**Edge returns 502 after recreating the API or the frontend**

Nginx resolves `api` and `web` at startup. If those containers are recreated with new addresses, recreate the ingress to refresh the internal resolution:

```bash
docker compose up -d --force-recreate ingress
```

**Outdated Prisma Client after changing the schema**

```bash
docker compose build api
docker compose up -d api
```

**Frontend cannot reach the API**

In Compose, the ingress forwards `/api` to `http://api:3000` and `VITE_API_URL` is `/api`. Confirm that `web` and `api` are healthy and that the ingress responds:

```bash
docker compose ps
docker compose logs -f ingress
docker compose exec ingress nginx -t
docker compose exec ingress wget -qO- http://api:3000/health
```

The local entry point is `http://localhost:5173`; the local public health check is at `http://localhost:5173/api/health`. In local development outside Docker, Vite handles the proxy with `VITE_API_PROXY_TARGET` (`http://localhost:3000`). If you are using an absolute URL in `VITE_API_URL`, check the API CORS settings.

**Database in an inconsistent state**

```bash
docker compose down -v
docker compose up --build
```

## Decisions and known limitations

This section makes explicit what the project does **not** do, and why. None of these items are bugs: they are scope choices, each with the alternative that would be needed to change it.

- **Browser session.** The access token lives only in memory; the refresh token lives in an `HttpOnly` + `SameSite=strict` cookie. The refresh is rotated and deduplicated on the client. Logout and `401` clear the query cache. To switch to another transport, review CORS/CSRF and the cookie configuration.
- **Logout.** The frontend calls `POST /auth/logout` before clearing local state; if the API is unavailable, the local logout still happens and the cookie may remain valid until it expires.
- **Login rate limit.** In memory, global, and fixed-window; it resets on restart and is not shared across replicas. To change it: a counter in Postgres (or Redis) per email + IP, with a sliding window.
- **Listing.** The interface uses the board (`GET /applications/board`); the API keeps the paginated listing endpoint for integrations and statistics.
- **Users.** Public sign-up is available behind `REGISTRATION_ENABLED`, with email verification, Google sign-in, and password recovery by email. There is no password change from inside the interface: passwords are changed through the recovery flow. To change it: an authenticated password change endpoint that revokes the other sessions.
- **Roles and permissions.** Each user sees only their own applications, but there are no roles (admin, viewer) or sharing between accounts. To change it: a roles model and per-resource authorization rules.
- **Guard cost.** It validates the signature and queries `users` on every request (one primary-key `SELECT`). To change it: an in-memory cache with a short TTL, if the volume justifies it.
- **UI tests.** Components and pages have Testing Library tests, hooks/services have coverage, and Playwright covers the critical path (login, creation, search, detail, and deletion). E2E runs on PRs, on demand, and on a schedule. Visual regression uses Linux snapshots and runs in a separate workflow.
- **Observability.** Default Nest/Fastify logging, with no request ID or metrics. To change it: structured Pino logging, request correlation, and a metrics endpoint.

## License

MIT — see [LICENSE](LICENSE).

To report a vulnerability, follow [SECURITY.md](SECURITY.md). Do not open a public issue.
