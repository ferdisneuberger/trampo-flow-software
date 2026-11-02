import { Prisma, RefreshToken as PrismaRefreshToken } from '@prisma/client';
import {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
} from '../../../../domain/auth/repositories/refresh-token.repository';

export class RefreshTokenMapper {
  static toDomain(record: PrismaRefreshToken): RefreshTokenRecord {
    return {
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      familyId: record.familyId,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      replacedBy: record.replacedBy,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    };
  }

  static toCreateData(
    input: CreateRefreshTokenInput,
  ): Prisma.RefreshTokenCreateInput {
    return {
      id: input.id,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      user: { connect: { id: input.userId } },
    };
  }
}
