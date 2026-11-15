import { Injectable } from '@nestjs/common';
import { OAuthTokenRepository } from '../../../../domain/oauth/repositories/oauth-token.repository';
import type {
  OAuthAccessTokenRecord,
  OAuthRefreshTokenRecord,
} from '../../../../domain/oauth/records';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaOAuthTokenRepository implements OAuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAccessToken(token: OAuthAccessTokenRecord): Promise<void> {
    await this.prisma.oAuthAccessToken.create({ data: token });
  }

  findAccessTokenByHash(
    tokenHash: string,
  ): Promise<OAuthAccessTokenRecord | null> {
    return this.prisma.oAuthAccessToken.findUnique({ where: { tokenHash } });
  }

  async deleteAccessTokenByHash(tokenHash: string): Promise<void> {
    await this.prisma.oAuthAccessToken.deleteMany({ where: { tokenHash } });
  }

  async createRefreshToken(token: OAuthRefreshTokenRecord): Promise<void> {
    await this.prisma.oAuthRefreshToken.create({ data: token });
  }

  findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<OAuthRefreshTokenRecord | null> {
    return this.prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });
  }

  async rotateRefreshToken(
    id: string,
    replacedBy: string,
    at: Date,
  ): Promise<void> {
    await this.prisma.oAuthRefreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, replacedBy },
    });
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.prisma.oAuthRefreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async revokeAllForGrant(grantId: string, at: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.oAuthRefreshToken.updateMany({
        where: { grantId, revokedAt: null },
        data: { revokedAt: at },
      }),
      this.prisma.oAuthAccessToken.deleteMany({ where: { grantId } }),
    ]);
  }

  async deleteExpiredAccessTokens(before: Date): Promise<number> {
    const result = await this.prisma.oAuthAccessToken.deleteMany({
      where: { expiresAt: { lt: before } },
    });

    return result.count;
  }

  async deleteStaleRefreshTokens(
    expiredBefore: Date,
    revokedBefore: Date,
  ): Promise<number> {
    const result = await this.prisma.oAuthRefreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: expiredBefore } },
          { revokedAt: { lt: revokedBefore } },
        ],
      },
    });

    return result.count;
  }
}
