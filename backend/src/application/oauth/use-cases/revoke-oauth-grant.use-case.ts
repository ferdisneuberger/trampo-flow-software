import { Injectable, Optional } from '@nestjs/common';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../../domain/oauth/repositories/oauth-token.repository';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import { NotFoundError } from '../../shared/errors/not-found.error';

@Injectable()
export class RevokeOAuthGrantUseCase {
  constructor(
    private readonly grants: OAuthGrantRepository,
    private readonly tokens: OAuthTokenRepository,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(input: { userId: string; grantId: string }): Promise<void> {
    const now = new Date();

    // `revokeForUser` confere o dono: ninguém revoga o grant de outra pessoa.
    if (!(await this.grants.revokeForUser(input.grantId, input.userId, now))) {
      throw new NotFoundError(
        'Aplicativo conectado não encontrado.',
        'OAUTH_GRANT_NOT_FOUND',
      );
    }

    await this.tokens.revokeAllForGrant(input.grantId, now);
    this.metrics.oauthRevocation('grant');
  }
}
