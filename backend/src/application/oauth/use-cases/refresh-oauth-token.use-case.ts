import { Injectable, Optional } from '@nestjs/common';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { OAuthClientRepository } from '../../../domain/oauth/repositories/oauth-client.repository';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../../domain/oauth/repositories/oauth-token.repository';
import {
  isSubsetOfScope,
  normalizeRequestedScope,
} from '../../../domain/oauth/scopes';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import { OAuthError } from '../errors/oauth.error';
import { canonicalResource, OAuthSettings } from '../services/oauth-settings';
import {
  OAuthTokenIssuer,
  type OAuthTokenResponse,
} from '../services/oauth-token-issuer';

export type RefreshOAuthTokenInput = {
  refreshToken: string;
  clientId: string;
  scope?: string;
  resource?: string;
};

// Qualquer falha devolve `invalid_grant` (o Claude exige) e a mesma mensagem.
const INVALID_GRANT = 'Refresh token inválido, expirado ou revogado.';

@Injectable()
export class RefreshOAuthTokenUseCase {
  constructor(
    private readonly tokens: OAuthTokenRepository,
    private readonly grants: OAuthGrantRepository,
    private readonly clients: OAuthClientRepository,
    private readonly issuer: OAuthTokenIssuer,
    private readonly hasher: TokenHasher,
    private readonly settings: OAuthSettings,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(input: RefreshOAuthTokenInput): Promise<OAuthTokenResponse> {
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
    const record = await this.tokens.findRefreshTokenByHash(
      this.hasher.hash(input.refreshToken),
    );

    if (!record) {
      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    const grant = await this.grants.findById(record.grantId);
    const client = await this.clients.findByClientId(input.clientId);

    if (!grant || grant.revokedAt || !client || client.id !== grant.clientRef) {
      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new OAuthError('invalid_grant', INVALID_GRANT);
    }

    // Reuso de um refresh já rotacionado: só se perdoa dentro da janela de
    // graça (retry concorrente). Fora dela, a família inteira é revogada.
    if (record.revokedAt) {
      const withinGrace =
        record.replacedBy !== null &&
        now.getTime() - record.revokedAt.getTime() <=
          this.settings.refreshGraceMs;

      if (!withinGrace) {
        this.metrics.oauthRefreshReuse();
        await this.tokens.revokeFamily(record.familyId, now);

        throw new OAuthError('invalid_grant', INVALID_GRANT);
      }
    }

    let scope = grant.scope;

    if (input.scope !== undefined) {
      const requested = normalizeRequestedScope(input.scope);

      // Nunca amplia: o novo token não passa do que o grant já tem.
      if (!requested || !isSubsetOfScope(requested, grant.scope)) {
        throw new OAuthError(
          'invalid_scope',
          'O escopo pedido excede o autorizado.',
        );
      }

      scope = requested.join(' ');
    }

    const { response, refreshTokenId } = await this.issuer.issue({
      grantId: grant.id,
      scope,
      familyId: record.familyId,
    });

    if (!record.revokedAt) {
      await this.tokens.rotateRefreshToken(record.id, refreshTokenId, now);
    }

    await this.grants.touchLastUsed(grant.id, now);

    return response;
  }
}
