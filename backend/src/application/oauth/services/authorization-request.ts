import { isClaudeRedirectUri } from '../../../domain/oauth/redirect-uri-policy';
import { matchesRegisteredRedirectUri } from '../../../domain/oauth/redirect-uri-policy';
import { isValidCodeChallenge } from '../../../domain/oauth/pkce';
import { normalizeRequestedScope } from '../../../domain/oauth/scopes';
import { OAuthError } from '../errors/oauth.error';
import { canonicalResource, OAuthSettings } from './oauth-settings';
import { ResolvedOAuthClient } from '../use-cases/resolve-oauth-client.use-case';
import { ResolveOAuthClientUseCase } from '../use-cases/resolve-oauth-client.use-case';
import { Injectable } from '@nestjs/common';

const MAX_STATE_LENGTH = 2048;

export type AuthorizationParams = Record<string, unknown>;

export type ValidatedAuthorizationRequest = {
  client: ResolvedOAuthClient;
  redirectUri: string;
  codeChallenge: string;
  /** Escopo normalizado (pode incluir `offline_access`). */
  scope: string;
  state: string | undefined;
  verified: boolean;
  redirectHost: string;
};

function text(
  params: AuthorizationParams,
  name: string,
  required: boolean,
): string | undefined {
  const value = params[name];

  if (value === undefined || value === '') {
    if (required) {
      throw new OAuthError('invalid_request', `Parâmetro ${name} ausente.`);
    }

    return undefined;
  }

  if (typeof value !== 'string') {
    throw new OAuthError('invalid_request', `Parâmetro ${name} inválido.`);
  }

  return value;
}

/**
 * Validação única do pedido de autorização, usada por `preview` e por
 * `decision` (que revalida tudo: o preview não é confiável).
 */
@Injectable()
export class AuthorizationRequestValidator {
  constructor(
    private readonly settings: OAuthSettings,
    private readonly resolveClient: ResolveOAuthClientUseCase,
  ) {}

  async validate(
    params: AuthorizationParams,
  ): Promise<ValidatedAuthorizationRequest> {
    if (text(params, 'response_type', true) !== 'code') {
      throw new OAuthError('invalid_request', 'response_type deve ser "code".');
    }

    const clientId = text(params, 'client_id', true) as string;
    const redirectUri = text(params, 'redirect_uri', true) as string;
    const client = await this.resolveClient.execute(clientId);

    if (!matchesRegisteredRedirectUri(redirectUri, client.redirectUris)) {
      throw new OAuthError(
        'invalid_request',
        'redirect_uri não consta entre os endereços do aplicativo.',
      );
    }

    // Só S256: `plain` e a ausência de PKCE são recusados.
    if (text(params, 'code_challenge_method', true) !== 'S256') {
      throw new OAuthError(
        'invalid_request',
        'code_challenge_method deve ser "S256".',
      );
    }

    const codeChallenge = text(params, 'code_challenge', true) as string;

    if (!isValidCodeChallenge(codeChallenge)) {
      throw new OAuthError('invalid_request', 'code_challenge inválido.');
    }

    const scopes = normalizeRequestedScope(text(params, 'scope', false));

    if (!scopes) {
      throw new OAuthError('invalid_scope', 'Escopo não suportado.');
    }

    const resource = text(params, 'resource', false);

    if (
      resource !== undefined &&
      canonicalResource(resource) !== this.settings.resource
    ) {
      throw new OAuthError(
        'invalid_target',
        'resource não corresponde a este servidor MCP.',
      );
    }

    const state = text(params, 'state', false);

    if (state !== undefined && state.length > MAX_STATE_LENGTH) {
      throw new OAuthError('invalid_request', 'state longo demais.');
    }

    return {
      client,
      redirectUri,
      codeChallenge,
      scope: scopes.join(' '),
      state,
      verified: client.verifiedOrigin || isClaudeRedirectUri(redirectUri),
      redirectHost: new URL(redirectUri).host,
    };
  }
}
