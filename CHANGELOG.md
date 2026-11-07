# Changelog

All notable changes to the project. The format follows Conventional Commits and
semantic versioning.

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
