import { Prisma, User as PrismaUser } from '@prisma/client';
import { User } from '../../../../domain/users/entities/user.entity';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.restore({
      id: record.id,
      username: record.username,
      passwordHash: record.passwordHash,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(user: User): Prisma.UserCreateInput {
    return {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toUpdateData(user: User): Prisma.UserUncheckedUpdateInput {
    return {
      username: user.username,
      passwordHash: user.passwordHash,
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt,
    };
  }
}
