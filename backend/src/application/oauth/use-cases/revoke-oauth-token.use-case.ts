import { Injectable, Optional } from '@nestjs/common';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../../domain/oauth/repositories/oauth-token.repository';
import {
  isOAuthAccessToken,
  isOAuthRefreshToken,
} from '../../../domain/oauth/services/oauth-token-generator';

/**
 * Revogação (RFC 7009). Nunca revela se o token existia. Revogar um refresh
 * revoga o grant inteiro (o app "saiu"); revogar um access derruba só ele.
 */
@Injectable()
export class RevokeOAuthTokenUseCase {
  constructor(
    private readonly tokens: OAuthTokenRepository,
    private readonly grants: OAuthGrantRepository,
    private readonly hasher: TokenHasher,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(token: string): Promise<void> {
    const hash = this.hasher.hash(token);
    const now = new Date();

    if (isOAuthRefreshToken(token)) {
      const record = await this.tokens.findRefreshTokenByHash(hash);

      if (record) {
        await this.grants.revoke(record.grantId, now);
        await this.tokens.revokeAllForGrant(record.grantId, now);
        this.metrics.oauthRevocation('grant');
      }

      return;
    }

    if (isOAuthAccessToken(token)) {
      // Só conta quando o token existia (a revogação nunca revela isso ao cliente).
      if (await this.tokens.findAccessTokenByHash(hash)) {
        await this.tokens.deleteAccessTokenByHash(hash);
        this.metrics.oauthRevocation('token');
      }
    }
  }
}
