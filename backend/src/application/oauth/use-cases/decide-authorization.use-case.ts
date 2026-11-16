import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OAuthClientRepository } from '../../../domain/oauth/repositories/oauth-client.repository';
import { OAuthCodeRepository } from '../../../domain/oauth/repositories/oauth-code.repository';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenGenerator } from '../../../domain/oauth/services/oauth-token-generator';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import {
  AuthorizationParams,
  AuthorizationRequestValidator,
} from '../services/authorization-request';
import { OAuthSettings } from '../services/oauth-settings';

export type DecideAuthorizationInput = {
  userId: string;
  params: AuthorizationParams;
  approve: boolean;
};

@Injectable()
export class DecideAuthorizationUseCase {
  constructor(
    private readonly validator: AuthorizationRequestValidator,
    private readonly clients: OAuthClientRepository,
    private readonly grants: OAuthGrantRepository,
    private readonly codes: OAuthCodeRepository,
    private readonly generator: OAuthTokenGenerator,
    private readonly hasher: TokenHasher,
    private readonly settings: OAuthSettings,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  /** Devolve a URL para onde o navegador deve ir (com `code` ou `error`). */
  async execute(
    input: DecideAuthorizationInput,
  ): Promise<{ redirectTo: string }> {
    // Revalida tudo: o `preview` não é confiável.
    const request = await this.validator.validate(input.params);
    const target = new URL(request.redirectUri);

    const kind = request.verified ? 'claude' : 'other';

    if (!input.approve) {
      this.metrics.oauthAuthorization('denied', kind, request.client.source);
      target.searchParams.set('error', 'access_denied');
    } else {
      const now = new Date();
      const client =
        request.client.source === 'cimd'
          ? await this.clients.upsertCimd({
              id: randomUUID(),
              clientId: request.client.clientId,
              name: request.client.name,
              redirectUris: request.client.redirectUris,
              source: 'cimd',
              createdAt: now,
            })
          : await this.requireDcrClient(request.client.clientId);
      const grant = await this.grants.activate({
        userId: input.userId,
        clientRef: client.id,
        scope: request.scope,
        resource: this.settings.resource,
      });
      const code = this.generator.authorizationCode();

      await this.codes.create({
        id: randomUUID(),
        codeHash: this.hasher.hash(code),
        grantId: grant.id,
        redirectUri: request.redirectUri,
        codeChallenge: request.codeChallenge,
        expiresAt: new Date(now.getTime() + this.settings.codeTtlMs),
        usedAt: null,
        createdAt: now,
      });
      await this.clients.touchLastUsed(client.id, now);

      this.metrics.oauthAuthorization('approved', kind, request.client.source);
      target.searchParams.set('code', code);
    }

    if (request.state !== undefined) {
      target.searchParams.set('state', request.state);
    }

    target.searchParams.set('iss', this.settings.issuer);

    return { redirectTo: target.toString() };
  }

  private async requireDcrClient(clientId: string) {
    const client = await this.clients.findByClientId(clientId);

    if (!client) {
      throw new Error('Cliente DCR desapareceu durante a autorização.');
    }

    return client;
  }
}
