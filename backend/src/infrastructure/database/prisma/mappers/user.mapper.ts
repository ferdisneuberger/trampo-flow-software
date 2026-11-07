import { Prisma, User as PrismaUser } from '@prisma/client';
import { User } from '../../../../domain/users/entities/user.entity';
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
} from '../../../../domain/users/enums/theme-preference.enum';

function toThemePreference(value: string) {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.restore({
      id: record.id,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      emailVerifiedAt: record.emailVerifiedAt,
      verificationSentAt: record.verificationSentAt,
      termsAcceptedAt: record.termsAcceptedAt,
      termsVersion: record.termsVersion,
      username: record.username,
      googleId: record.googleId,
      passwordHash: record.passwordHash,
      themePreference: toThemePreference(record.themePreference),
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(user: User): Prisma.UserCreateInput {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerifiedAt: user.emailVerifiedAt,
      verificationSentAt: user.verificationSentAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      username: user.username,
      googleId: user.googleId,
      passwordHash: user.passwordHash,
      themePreference: user.themePreference,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toUpdateData(user: User): Prisma.UserUncheckedUpdateInput {
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerifiedAt: user.emailVerifiedAt,
      verificationSentAt: user.verificationSentAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      passwordHash: user.passwordHash,
      themePreference: user.themePreference,
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt,
    };
  }
}
