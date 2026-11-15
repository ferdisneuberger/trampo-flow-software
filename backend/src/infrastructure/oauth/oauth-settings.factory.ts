import type { ConfigService } from '@nestjs/config';
import {
  canonicalResource,
  OAuthSettings,
} from '../../application/oauth/services/oauth-settings';

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isSecureOrLocal(url: URL): boolean {
  return (
    url.protocol === 'https:' ||
    (url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  );
}

/**
 * Lê as variáveis `OAUTH_*`. Com `OAUTH_ENABLED=true` o servidor não sobe se o
 * issuer ou o recurso não forem `https` (exceto `localhost`).
 */
export function createOAuthSettings(config: ConfigService): OAuthSettings {
  const enabled = config.get<string>('OAUTH_ENABLED')?.trim() === 'true';
  const appBaseUrl = (
    config.get<string>('APP_BASE_URL')?.trim() || 'http://localhost:5173'
  ).replace(/\/+$/, '');
  const issuer = (
    config.get<string>('OAUTH_ISSUER')?.trim() || appBaseUrl
  ).replace(/\/+$/, '');
  const resource = canonicalResource(
    config.get<string>('MCP_PUBLIC_URL')?.trim() || `${issuer}/mcp`,
  );

  if (enabled) {
    let issuerUrl: URL;

    try {
      issuerUrl = new URL(issuer);
    } catch {
      throw new Error('OAUTH_ISSUER inválido.');
    }

    if (!isSecureOrLocal(issuerUrl) || issuerUrl.pathname !== '/') {
      throw new Error(
        'OAUTH_ISSUER deve ser https (ou http em localhost) e sem caminho.',
      );
    }

    if (!resource || !isSecureOrLocal(new URL(resource))) {
      throw new Error(
        'MCP_PUBLIC_URL deve ser https (ou http em localhost), sem fragmento.',
      );
    }
  }

  return new OAuthSettings(
    enabled,
    issuer,
    resource ?? `${issuer}/mcp`,
    (config.get<string>('OAUTH_EXTRA_REDIRECT_URIS') ?? '')
      .split(',')
      .map((uri) => uri.trim())
      .filter(Boolean),
    positiveInt(config.get<string>('OAUTH_ACCESS_TOKEN_TTL_SECONDS'), 3600) *
      1000,
    positiveInt(config.get<string>('OAUTH_REFRESH_TOKEN_TTL_DAYS'), 30) *
      24 *
      3600 *
      1000,
    positiveInt(config.get<string>('OAUTH_CODE_TTL_SECONDS'), 60) * 1000,
    positiveInt(config.get<string>('OAUTH_MAX_CLIENTS'), 1000),
    10 * 1000,
  );
}
