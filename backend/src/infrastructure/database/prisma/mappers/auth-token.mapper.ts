import { AuthToken as PrismaAuthToken, Prisma } from '@prisma/client';
import { AuthToken } from '../../../../domain/auth/entities/auth-token.entity';

export class AuthTokenMapper {
  static toDomain(record: PrismaAuthToken): AuthToken {
    return AuthToken.restore({
      id: record.id,
      userId: record.userId,
      type: record.type,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }

  static toCreateData(token: AuthToken): Prisma.AuthTokenCreateInput {
    return {
      id: token.id,
      user: { connect: { id: token.userId } },
      type: token.type,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }
}
