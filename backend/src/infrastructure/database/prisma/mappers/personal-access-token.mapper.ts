import {
  PersonalAccessToken as PrismaPersonalAccessToken,
  Prisma,
} from '@prisma/client';
import { PersonalAccessToken } from '../../../../domain/auth/entities/personal-access-token.entity';

export class PersonalAccessTokenMapper {
  static toDomain(record: PrismaPersonalAccessToken): PersonalAccessToken {
    return PersonalAccessToken.restore({
      id: record.id,
      userId: record.userId,
      name: record.name,
      tokenHash: record.tokenHash,
      prefix: record.prefix,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
    });
  }

  static toCreateData(
    token: PersonalAccessToken,
  ): Prisma.PersonalAccessTokenCreateInput {
    return {
      id: token.id,
      user: { connect: { id: token.userId } },
      name: token.name,
      tokenHash: token.tokenHash,
      prefix: token.prefix,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    };
  }
}
