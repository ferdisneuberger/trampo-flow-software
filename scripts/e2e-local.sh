#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="trampo-e2e"
WEB_PORT="6173"
POSTGRES_PORT="55433"
MAILPIT_PORT="8026"
BASE_URL="http://127.0.0.1:${WEB_PORT}"
E2E_EMAIL="e2e@example.com"
E2E_PASSWORD="E2e-super-secret-123"
JWT_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef"
AUTH_TOKEN_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef"

if ! command -v docker > /dev/null 2>&1; then
  echo "e2e-local: docker não encontrado." >&2
  exit 1
fi

cleanup() {
  COMPOSE_PROJECT_NAME="$PROJECT" docker compose down -v --remove-orphans > /dev/null 2>&1 || true
}
trap cleanup EXIT

echo "e2e-local: subindo stack isolado em ${BASE_URL}"

COMPOSE_PROJECT_NAME="$PROJECT" \
WEB_PORT="$WEB_PORT" \
POSTGRES_PORT="$POSTGRES_PORT" \
MAILPIT_PORT="$MAILPIT_PORT" \
POSTGRES_DB="trampo_e2e" \
POSTGRES_USER="trampo" \
POSTGRES_PASSWORD="trampo_e2e" \
AUTH_TOKEN_SECRET="$AUTH_TOKEN_SECRET" \
APP_BASE_URL="$BASE_URL" \
REGISTRATION_ENABLED="true" \
SMTP_HOST="mailpit" \
SMTP_PORT="1025" \
SMTP_SECURE="false" \
SMTP_USER="" \
SMTP_PASS="" \
MAIL_FROM="e2e@example.com" \
MAIL_FROM_NAME="Trampo Flow" \
JWT_SECRET="$JWT_SECRET" \
CORS_ORIGINS="$BASE_URL" \
docker compose up -d --build postgres mailpit api web ingress

echo "e2e-local: aguardando a API"

for _ in $(seq 1 90); do
  if curl -fsS "${BASE_URL}/api/health" > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "${BASE_URL}/api/health" > /dev/null 2>&1; then
  echo "e2e-local: a API não respondeu em ${BASE_URL}" >&2
  COMPOSE_PROJECT_NAME="$PROJECT" docker compose logs --tail 40 api >&2 || true
  exit 1
fi

cd frontend

if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "e2e-local: instalando Chromium do Playwright"
  npx playwright install chromium
fi

E2E_EMAIL="$E2E_EMAIL" \
E2E_MAILPIT_URL="http://127.0.0.1:${MAILPIT_PORT}" \
E2E_PASSWORD="$E2E_PASSWORD" \
E2E_BASE_URL="$BASE_URL" \
npx playwright test "$@"
