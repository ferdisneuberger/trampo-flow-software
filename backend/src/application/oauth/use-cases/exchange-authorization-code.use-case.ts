import { Injectable } from '@nestjs/common';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { isValidCodeVerifier, verifyPkce } from '../../../domain/oauth/pkce';
import { OAuthClientRepository } from '../../../domain/oauth/repositories/oauth-client.repository';
import { OAuthCodeRepository } from '../../../domain/oauth/repositories/oauth-code.repository';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../../domain/oauth/repositories/oauth-token.repository';
import { OAuthError } from '../errors/oauth.error';
import { canonicalResource, OAuthSettings } from '../services/oauth-settings';
import {
  OAuthTokenIssuer,
  type OAuthTokenResponse,
} from '../services/oauth-token-issuer';

export type ExchangeAuthorizationCodeInput = {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
  resource?: string;
};

const INVALID_GRANT = 'Código de autorização inválido, expirado ou já usado.';

@Injectable()
export class ExchangeAuthorizationCodeUseCase {
  constructor(
    private readonly codes: OAuthCodeRepository,
    private readonly grants: OAuthGrantRepository,
    private readonly clients: OAuthClientRepository,
    private readonly tokens: OAuthTokenRepository,
    private readonly issuer: OAuthTokenIssuer,
    private readonly hasher: TokenHasher,
    private readonly settings: OAuthSettings,
  ) {}

  async execute(
    input: ExchangeAuthorizationCodeInput,
  ): Promise<OAuthTokenResponse> {
    if (!isValidCodeVerifier(input.codeVerifier)) {
      throw new OAuthError('invalid_request', 'code_verifier inválido.');
    }

    if (
      input.resource !== undefined &&
      canonicalResource(input.resource) !== this.settings.resource
    ) {
      throw new OAuthError(
        'invalid_target',
        'resource não corresponde a este servidor MCP.',
      );
    }

    const now = new Date();
    const code = await this.codes.findByHash(this.hasher.hash(input.code));

    if (!code) {
      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    // Código já usado que reaparece: sinal de roubo. Derruba o grant inteiro.
    if (code.usedAt) {
      await this.revokeGrant(code.grantId, now);

      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    const grant = await this.grants.findById(code.grantId);
    const client = await this.clients.findByClientId(input.clientId);

    if (
      !grant ||
      grant.revokedAt ||
      !client ||
      client.id !== grant.clientRef ||
      code.expiresAt.getTime() <= now.getTime() ||
      code.redirectUri !== input.redirectUri ||
      !verifyPkce(input.codeVerifier, code.codeChallenge)
    ) {
      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    // Troca atômica: de duas requisições simultâneas, só uma passa.
    if (!(await this.codes.markUsed(code.id, now))) {
      await this.revokeGrant(code.grantId, now);

      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    const { response } = await this.issuer.issue({
      grantId: grant.id,
      scope: grant.scope,
    });

    await this.grants.touchLastUsed(grant.id, now);
    await this.clients.touchLastUsed(client.id, now);

    return response;
  }

  private async revokeGrant(grantId: string, at: Date): Promise<void> {
    await this.grants.revoke(grantId, at);
    await this.tokens.revokeAllForGrant(grantId, at);
  }
}
