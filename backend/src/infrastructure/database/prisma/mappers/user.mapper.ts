import { Prisma, User as PrismaUser } from '@prisma/client';
import { User } from '../../../../domain/users/entities/user.entity';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.restore({
      id: record.id,
      email: record.email,
      emailVerifiedAt: record.emailVerifiedAt,
      verificationSentAt: record.verificationSentAt,
      termsAcceptedAt: record.termsAcceptedAt,
      termsVersion: record.termsVersion,
      username: record.username,
      googleId: record.googleId,
      passwordHash: record.passwordHash,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(user: User): Prisma.UserCreateInput {
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      verificationSentAt: user.verificationSentAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      username: user.username,
      googleId: user.googleId,
      passwordHash: user.passwordHash,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toUpdateData(user: User): Prisma.UserUncheckedUpdateInput {
    return {
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      verificationSentAt: user.verificationSentAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      passwordHash: user.passwordHash,
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt,
    };
  }
}
