import type {
  OAuthAccessTokenRecord,
  OAuthRefreshTokenRecord,
} from '../records';

export abstract class OAuthTokenRepository {
  abstract createAccessToken(token: OAuthAccessTokenRecord): Promise<void>;

  abstract findAccessTokenByHash(
    tokenHash: string,
  ): Promise<OAuthAccessTokenRecord | null>;

  abstract deleteAccessTokenByHash(tokenHash: string): Promise<void>;

  abstract createRefreshToken(token: OAuthRefreshTokenRecord): Promise<void>;

  abstract findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<OAuthRefreshTokenRecord | null>;

  /** Marca como rotacionado (revogado e apontando para o substituto). */
  abstract rotateRefreshToken(
    id: string,
    replacedBy: string,
    at: Date,
  ): Promise<void>;

  abstract revokeFamily(familyId: string, at: Date): Promise<void>;

  /** Derruba todos os tokens do grant (acesso e refresh). */
  abstract revokeAllForGrant(grantId: string, at: Date): Promise<void>;

  abstract deleteExpiredAccessTokens(before: Date): Promise<number>;

  abstract deleteStaleRefreshTokens(
    expiredBefore: Date,
    revokedBefore: Date,
  ): Promise<number>;
}
