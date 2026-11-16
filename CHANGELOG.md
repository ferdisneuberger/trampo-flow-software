# Changelog

All notable changes to the project. The format follows Conventional Commits and
semantic versioning.

## 3.2.0 — 2026-11-15

### Added

- OAuth 2.1 for the MCP server, so Claude (web, mobile, and the Desktop
  connectors) connects with just `https://<host>/mcp`: the API is now an
  authorization server (`/.well-known/oauth-authorization-server`,
  `POST /oauth/register` with dynamic client registration and Client ID
  Metadata Documents, `/oauth/authorize/preview` and `/decision`,
  `POST /oauth/token`, `POST /oauth/revoke`, `GET/DELETE /oauth/grants`) and
  `/mcp` serves its protected resource metadata
  (`/.well-known/oauth-protected-resource`) and answers `401` with
  `resource_metadata`. PKCE S256 only, opaque `tfo_` (1 h) and rotating `tfr_`
  (30 days) tokens stored as HMAC, single-use authorization codes, a redirect
  URI allowlist (Claude, loopback, `OAUTH_EXTRA_REDIRECT_URIS`), and an
  SSRF-guarded CIMD fetcher. It ships **dark**: everything answers `404` until
  `OAUTH_ENABLED=true`.
- Consent screen `/oauth/authorize`, **Aplicativos conectados** (list and
  revoke), and a "Como conectar" panel in Settings.
- Permission choice for integration tokens (read-only or read and write) and
  `GET /auth/whoami`, which returns only the user id.
- `scripts/oauth-smoke.mjs`: dependency-free end-to-end check of the OAuth flow
  against any URL.
- Portuguese connection guide, `docs/guia-conexao-mcp.md`, covering OAuth and
  tokens, with what was and was not tested.
- Ingress routes, CORS for the OAuth endpoints, rate limits, and the `OAUTH_*`
  variables in Compose and `.env.example`.

### Changed

- Integration tokens and OAuth tokens are **denied by default**: they only
  reach routes that declare a scope (`@RequiredScope`), so profile, theme,
  email verification, token management, and `DELETE /applications/:id` need a
  session. Existing `tfp_` tokens keep read and write.
- The hosted MCP validates tokens with `GET /auth/whoami` instead of
  `GET /auth/me`.
- The SSRF-safe HTTP client was extracted from the job page fetcher and is
  shared with the CIMD fetcher.
- The README compatibility table no longer claims Claude Desktop accepts the
  hosted URL through its configuration file.

### Notes

- Not exercised with the real clients yet (Claude web, mobile, Desktop, Cursor,
  VS Code, `mcp-remote`): see the connection guide.
- The OAuth endpoints rely on Nest's built-in form parser; do not add
  `@fastify/formbody`.

## 3.1.0 — 2026-11-15

### Added

- MCP server in the new `mcp/` package (`@modelcontextprotocol/sdk` + `zod`)
  so AI agents can work with applications through the API. It is hosted at
  `/mcp` (stateless Streamable HTTP, new `mcp` Compose service behind the
  ingress, authenticated with each caller's integration token) and also runs
  locally over stdio. Tools: `preview_job_posting`,
  `create_application` (fills from the job page, never invents title or
  company, returns the existing application for a repeated link),
  `list_applications`, `get_application`, `update_application`,
  `move_application` (top of the target column), and `pipeline_summary`, plus
  the `revisar_funil` prompt. No tool deletes applications; reads are annotated
  `readOnlyHint` and writes `destructiveHint: false`.
- Personal access tokens (`tfp_…`) for integrations: `POST/GET/DELETE
/auth/tokens`, stored only as an HMAC hash with an 8-character display
  prefix, 1–365 days of validity (default 90), at most 20 active per user,
  throttled `last_used_at`, and a per-token write rate limit. The routes accept
  only the session JWT (`@SessionOnly()`), so a token cannot mint tokens, and
  `DELETE /applications/:id` is session-only too, so a token (or an agent using
  it) can never delete applications; it can only move them to Recusada or
  Finalizada.
- Settings page (`/configuracoes`) with **Tokens de integração**: create, copy
  once, list with last use and expiration, and revoke, plus a ready-to-paste
  `claude mcp add --transport http` command pointing at the hosted `/mcp`. Reachable from the account menu and the sidebar.
- Prefill from the job link: `POST /applications/preview` reads title, company,
  and company website from the job page (with SSRF protections and a per-user
  rate limit), and the create modal starts with just the link field and tags
  the prefilled fields "do link".
- `mcp` job in CI (lint, typecheck, tests with coverage, build), the `mcp`
  image in the Docker build check and in the GHCR publish workflow, and `mcp/`
  in lint-staged and the root `lint` script.

### Changed

- Grafite theme: neutral graphite palette in light and dark, Hanken Grotesk,
  and a split-screen sign-in with the official Google button.
- On large screens the horizontal header became a collapsible sidebar that
  starts collapsed; mobile keeps a compact top bar.
- Cleaner create modal with a staged form; new applications start with the
  phase "Candidatura enviada".
- The authenticated request now carries `{ sub, authMethod, tokenId? }`
  instead of the raw JWT payload.
- The OpenAPI document describes both bearer formats (session JWT and `tfp_`).

## 3.0.0 — 2026-11-07

### Added

- Trampo Brasil visual identity across the board, authentication pages, and
  transactional emails, with self-hosted Bricolage Grotesque, DM Sans, and Space
  Mono fonts.
- Light, dark, and system themes, with light as the default. The preference is
  stored per user in `users.theme_preference`, exposed by `PATCH /auth/me/theme`,
  and cached locally to avoid a flash before React loads.
- Horizontal top header with brand, search, theme toggle, and an account menu
  containing logout.
- Playwright visual regression suite with Linux baselines and a dedicated
  workflow.
- Seed script and workflow step that create a verified E2E user without going
  through sign-up or email.

### Changed

- The board shell moved from the yellow sidebar to a horizontal header; the
  mobile drawer and the helper tip were removed.
- The E2E critical path no longer depends on sign-up or email; public sign-up
  remains the only mail-dependent flow.
- E2E runs require an explicit `E2E_BASE_URL` to avoid pointing at the
  development stack.
- The favicon URL is versioned to bypass browser icon caches.
- `GET /auth/me` and login responses include the user's theme preference.

### Removed

- File upload/download, the `application_files` table, S3/MinIO storage,
  Adminer, and their dependencies and configuration.
- The yellow sidebar, mobile drawer, navigation helper tip, and notification
  icon.

### Fixed

- Theme synchronization no longer overwrites the saved account preference when
  the value comes from the server or another tab.
- `PATCH /auth/me/theme` now returns the full profile, including the verification
  resend cooldown.
- The board search field remains accessible to the existing E2E flow.
- The application detail tip no longer duplicates the current phase text.

## 2.0.4 — 2026-11-06

### Added

- Public sign-up with email verification, hashed tokens, resend limits, and
  transactional emails via SMTP (Mailpit in development).
- Password recovery with single-use tokens, a default 15-minute expiration, and
  revocation of all sessions after the change.
- Google sign-in, with ID token verification, accounts created already verified, and
  linking only to verified emails.
- Administrative endpoint `DELETE /admin/users/:email`, protected by `x-api-key` and
  rate limits, with cascading data deletion and owner backup/restore scripts.
- First and last name on sign-up and in authentication responses.
- Workflow that publishes the backend and frontend images to GHCR on every push to
  `main`.

### Changed

- Login now uses email as the identity; the username is optional and user bootstrap
  through environment variables was removed.
- The password policy now requires at least 8 characters, with real-time feedback and a
  visibility toggle.
- Password reset links expire in 15 minutes; the email verification TTL and the login
  rate limit window were reduced.
- Users without a verified email can sign in, but are directed to verification and
  cannot create applications until they confirm the account.
- The workspace is now board-only: the dashboard, list view, and account page were
  removed.
- The board keeps the four columns horizontal on any viewport, with internal scrolling,
  and the application detail page was reorganized.
- Session handling and cache invalidation were consolidated; file upload and download
  were removed from the interface.
- The API Dockerfile became multi-stage, reducing the image from 1.27 GB to 818 MB.
- SMTP logs show a masked configuration and delivery failures with code and command.
- `backend/.env.example` aligned with the Compose defaults for JWT, refresh token,
  login window, and email verification TTL.

### Fixed

- Email delivery failures are now logged with enough context for diagnosis.
- Clicks generated at the end of a drag no longer open the card by mistake.
- Application creation by users without a verified email is blocked on the client and
  in the API.

### Removed

- Dashboard, table listing, and account page.
- File upload and download through the interface.
- User bootstrap through environment variables.

## 2.0.3 — 2026-11-02

### Changed

- Storage client migrated to AWS SDK v3.
- Overrides for `deepmerge-ts`, `glob`, and `minimatch`.
- E2E pipeline disabled until the release is reviewed.

### Fixed

- Vulnerabilities brought to zero across the three packages.

## 2.0.2 — 2026-11-02

### Added

- Local E2E check on pre-push, with an escape hatch via `SKIP_E2E`.
- E2E workflow with path filters and browser caching.

### Changed

- The end-to-end flow now covers session reload.

## 2.0.1 — 2026-11-02

### Fixed

- Logout on page refresh: the renewed access token is now stored before fetching the
  profile.

## 2.0.0 — 2026-11-02

### Added

- Applications now belong to a user (`user_id`), with owner filtering on every query
  and 404 for records from another account.
- `company` and `companyUrl` fields, validated in the domain.
- Kanban board with columns per status, drag and drop, and manual reordering via
  `PATCH /applications/:id/placement`.
- Position persisted in multiples of 1000, with automatic reindexing when the gap
  between neighbors runs out.
- Search by title, company, and phase, with status filtering and cursor pagination in
  `GET /applications`.
- `GET /applications/stats` with counters per status.
- `GET /applications/board` with columns ordered by position.
- `GET /applications/:id` for the detail screen.
- Real file upload to S3-compatible storage (MinIO in Compose), limited to PDF and TXT,
  5 MB per file, and 3 per application. Validation by extension and magic bytes.
- Authenticated file download and removal.
- Refresh token in an `HttpOnly` cookie, with family rotation, reuse detection, and a
  grace window for multiple tabs.
- `POST /auth/refresh` and `POST /auth/logout`.
- Dashboard with counters and the longest-idle applications.
- Account page.
- Component tests with Testing Library and an end-to-end flow with Playwright.

### Changed

- The access token now lives in memory, with a default 5-minute lifetime and automatic
  renewal on the client.
- `GET /applications` returns `{ items, nextCursor, hasMore }` instead of an array.
- The JWT `sub` is now the user id, not the username.
- Navigation moved from the header to a sidebar, with a desktop-first layout.
- Surfaces use borders instead of shadows; card radius standardized at 12px.
- The application form no longer manages attachments; upload happens on the detail
  screen.
- Old files, which were URLs, remain available as external links.

### Fixed

- New applications were created with `position` zero and tied in the board ordering.
- The refresh grace window accepted tokens revoked by reuse detection.
- `UserBootstrapService` created the first user without checking the password policy.

### Removed

- `ApplicationsContext` and the manual loading hook, replaced by TanStack Query.
- Card-based list components and the metadata-based uploader.
- `token-storage` (localStorage).
