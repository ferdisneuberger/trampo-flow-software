import { createHash, createHmac, randomBytes } from 'node:crypto';
import { AuthorizationRequestValidator } from '../../src/application/oauth/services/authorization-request';
import { OAuthSettings } from '../../src/application/oauth/services/oauth-settings';
import { OAuthTokenIssuer } from '../../src/application/oauth/services/oauth-token-issuer';
import { AuthenticateOAuthAccessTokenUseCase } from '../../src/application/oauth/use-cases/authenticate-oauth-access-token.use-case';
import { DecideAuthorizationUseCase } from '../../src/application/oauth/use-cases/decide-authorization.use-case';
import { ExchangeAuthorizationCodeUseCase } from '../../src/application/oauth/use-cases/exchange-authorization-code.use-case';
import { GetAuthorizationServerMetadataUseCase } from '../../src/application/oauth/use-cases/get-authorization-server-metadata.use-case';
import { ListOAuthGrantsUseCase } from '../../src/application/oauth/use-cases/list-oauth-grants.use-case';
import { PreviewAuthorizationUseCase } from '../../src/application/oauth/use-cases/preview-authorization.use-case';
import { RefreshOAuthTokenUseCase } from '../../src/application/oauth/use-cases/refresh-oauth-token.use-case';
import { RegisterOAuthClientUseCase } from '../../src/application/oauth/use-cases/register-oauth-client.use-case';
import { ResolveOAuthClientUseCase } from '../../src/application/oauth/use-cases/resolve-oauth-client.use-case';
import { RevokeOAuthGrantUseCase } from '../../src/application/oauth/use-cases/revoke-oauth-grant.use-case';
import { RevokeOAuthTokenUseCase } from '../../src/application/oauth/use-cases/revoke-oauth-token.use-case';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import {
  ClientMetadataFetcher,
  type ClientMetadataFetchResult,
} from '../../src/domain/oauth/services/client-metadata-fetcher';
import { CryptoOAuthTokenGenerator } from '../../src/infrastructure/oauth/crypto-oauth-token-generator';
import {
  InMemoryOAuthClientRepository,
  InMemoryOAuthCodeRepository,
  InMemoryOAuthGrantRepository,
  InMemoryOAuthTokenRepository,
} from '../repositories/in-memory-oauth.repositories';

export const ISSUER = 'https://trampo.example.com';
export const RESOURCE = `${ISSUER}/mcp`;
export const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
export const OTHER_USER_ID = '9a9f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d99';
export const CLAUDE_CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
export const CLAUDE_CODE_CLIENT =
  'https://claude.ai/oauth/claude-code-client-metadata';

class TestHasher extends TokenHasher {
  hash(value: string): string {
    return createHmac('sha256', 'test-secret').update(value).digest('hex');
  }
}

export class FakeClientMetadataFetcher extends ClientMetadataFetcher {
  calls = 0;
  documents = new Map<string, ClientMetadataFetchResult>();

  async fetch(url: string): Promise<ClientMetadataFetchResult> {
    this.calls += 1;

    return this.documents.get(url) ?? { ok: false, reason: 'unreachable' };
  }
}

export function pkcePair() {
  const verifier = randomBytes(32).toString('base64url');

  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
}

export function buildOAuthStack(
  overrides: Partial<{ resource: string; enabled: boolean }> = {},
) {
  const settings = new OAuthSettings(
    overrides.enabled ?? true,
    ISSUER,
    overrides.resource ?? RESOURCE,
    [],
    3600_000,
    30 * 24 * 3600_000,
    60_000,
    1000,
    10_000,
  );
  const clients = new InMemoryOAuthClientRepository();
  const grants = new InMemoryOAuthGrantRepository();
  const codes = new InMemoryOAuthCodeRepository();
  const tokens = new InMemoryOAuthTokenRepository();
  const hasher = new TestHasher();
  const generator = new CryptoOAuthTokenGenerator();
  const fetcher = new FakeClientMetadataFetcher();
  const users = {
    existing: new Set([USER_ID, OTHER_USER_ID]),
    existsById: async (id: string) => users.existing.has(id),
  };
  const resolveClient = new ResolveOAuthClientUseCase(
    clients,
    fetcher,
    settings,
  );
  const validator = new AuthorizationRequestValidator(settings, resolveClient);
  const issuer = new OAuthTokenIssuer(tokens, generator, hasher, settings);

  return {
    settings,
    clients,
    grants,
    codes,
    tokens,
    hasher,
    fetcher,
    users,
    resolveClient,
    register: new RegisterOAuthClientUseCase(clients, generator, settings),
    preview: new PreviewAuthorizationUseCase(validator),
    decide: new DecideAuthorizationUseCase(
      validator,
      clients,
      grants,
      codes,
      generator,
      hasher,
      settings,
    ),
    exchange: new ExchangeAuthorizationCodeUseCase(
      codes,
      grants,
      clients,
      tokens,
      issuer,
      hasher,
      settings,
    ),
    refresh: new RefreshOAuthTokenUseCase(
      tokens,
      grants,
      clients,
      issuer,
      hasher,
      settings,
    ),
    revokeToken: new RevokeOAuthTokenUseCase(tokens, grants, hasher),
    listGrants: new ListOAuthGrantsUseCase(grants, clients),
    revokeGrant: new RevokeOAuthGrantUseCase(grants, tokens),
    authenticate: new AuthenticateOAuthAccessTokenUseCase(
      tokens,
      grants,
      users as never,
      hasher,
      settings,
    ),
    metadata: new GetAuthorizationServerMetadataUseCase(settings),
  };
}

export type OAuthStack = ReturnType<typeof buildOAuthStack>;

/** Registra um cliente DCR com o callback do Claude e devolve o `client_id`. */
export async function registerClient(
  stack: OAuthStack,
  redirectUris: string[] = [CLAUDE_CALLBACK],
): Promise<string> {
  const registered = await stack.register.execute({
    client_name: 'Claude',
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
  });

  return registered.client_id;
}

export function authorizeParams(
  clientId: string,
  challenge: string,
  extra: Record<string, unknown> = {},
) {
  return {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CLAUDE_CALLBACK,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'applications:read applications:write',
    state: 'xyz',
    resource: RESOURCE,
    ...extra,
  };
}

/** Faz o fluxo até o código (aprovado) e devolve `code` e `verifier`. */
export async function authorize(
  stack: OAuthStack,
  clientId: string,
  options: { userId?: string; extra?: Record<string, unknown> } = {},
) {
  const { verifier, challenge } = pkcePair();
  const { redirectTo } = await stack.decide.execute({
    userId: options.userId ?? USER_ID,
    params: authorizeParams(clientId, challenge, options.extra),
    approve: true,
  });
  const url = new URL(redirectTo);

  return { code: url.searchParams.get('code') as string, verifier, url };
}

export function tokenInput(
  clientId: string,
  code: string,
  verifier: string,
  extra: Record<string, string> = {},
) {
  return {
    code,
    redirectUri: CLAUDE_CALLBACK,
    clientId,
    codeVerifier: verifier,
    resource: RESOURCE,
    ...extra,
  };
}
