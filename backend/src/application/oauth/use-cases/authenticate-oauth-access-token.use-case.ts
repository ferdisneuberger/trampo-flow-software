import { Injectable, Optional } from '@nestjs/common';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../../domain/oauth/repositories/oauth-token.repository';
import { accessScopes } from '../../../domain/oauth/scopes';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';
import { OAuthSettings } from '../services/oauth-settings';

/** Intervalo mínimo entre gravações de `lastUsedAt`. */
export const OAUTH_LAST_USED_THROTTLE_MS = 60 * 1000;

export type AuthenticatedOAuthAccessToken = {
  userId: string;
  tokenId: string;
  grantId: string;
  scopes: string[];
};

@Injectable()
export class AuthenticateOAuthAccessTokenUseCase {
  constructor(
    private readonly tokens: OAuthTokenRepository,
    private readonly grants: OAuthGrantRepository,
    private readonly users: UserRepository,
    private readonly hasher: TokenHasher,
    private readonly settings: OAuthSettings,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(secret: string): Promise<AuthenticatedOAuthAccessToken> {
    const now = new Date();
    const token = await this.tokens.findAccessTokenByHash(
      this.hasher.hash(secret),
    );
    const grant = token ? await this.grants.findById(token.grantId) : null;
    const reason =
      !token || !grant
        ? 'unknown'
        : token.expiresAt.getTime() <= now.getTime()
          ? 'expired'
          : grant.revokedAt
            ? 'revoked'
            : // Audiência: o token só vale para este servidor MCP.
              grant.resource !== this.settings.resource
              ? 'audience_mismatch'
              : !(await this.users.existsById(grant.userId))
                ? 'unknown'
                : null;

    if (reason || !token || !grant) {
      this.metrics.oauthAccessTokenAuth(reason ?? 'unknown');

      throw new UnauthorizedError(
        'Token de acesso inválido, expirado ou revogado.',
        'INVALID_OAUTH_ACCESS_TOKEN',
      );
    }

    this.metrics.oauthAccessTokenAuth('ok');

    if (
      !grant.lastUsedAt ||
      now.getTime() - grant.lastUsedAt.getTime() >= OAUTH_LAST_USED_THROTTLE_MS
    ) {
      await this.grants.touchLastUsed(grant.id, now);
    }

    return {
      userId: grant.userId,
      tokenId: token.id,
      grantId: grant.id,
      scopes: accessScopes(token.scope),
    };
  }
}
