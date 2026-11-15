import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OAuthTokenRepository } from '../../../domain/oauth/repositories/oauth-token.repository';
import { OAuthTokenGenerator } from '../../../domain/oauth/services/oauth-token-generator';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { OAuthSettings } from './oauth-settings';

export type OAuthTokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
};

@Injectable()
export class OAuthTokenIssuer {
  constructor(
    private readonly tokens: OAuthTokenRepository,
    private readonly generator: OAuthTokenGenerator,
    private readonly hasher: TokenHasher,
    private readonly settings: OAuthSettings,
  ) {}

  /**
   * Emite um par de tokens. O refresh herda a família informada (rotação) ou
   * abre uma nova. Os segredos só existem aqui e na resposta: o banco guarda
   * apenas o HMAC.
   */
  async issue(input: {
    grantId: string;
    scope: string;
    familyId?: string;
  }): Promise<{ response: OAuthTokenResponse; refreshTokenId: string }> {
    const now = new Date();
    const accessToken = this.generator.accessToken();
    const refreshToken = this.generator.refreshToken();
    const refreshTokenId = randomUUID();

    await this.tokens.createAccessToken({
      id: randomUUID(),
      tokenHash: this.hasher.hash(accessToken),
      grantId: input.grantId,
      scope: input.scope,
      expiresAt: new Date(now.getTime() + this.settings.accessTokenTtlMs),
      createdAt: now,
    });
    await this.tokens.createRefreshToken({
      id: refreshTokenId,
      tokenHash: this.hasher.hash(refreshToken),
      grantId: input.grantId,
      familyId: input.familyId ?? randomUUID(),
      replacedBy: null,
      revokedAt: null,
      expiresAt: new Date(now.getTime() + this.settings.refreshTokenTtlMs),
      createdAt: now,
    });

    return {
      refreshTokenId,
      response: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor(this.settings.accessTokenTtlMs / 1000),
        refresh_token: refreshToken,
        scope: input.scope,
      },
    };
  }
}
