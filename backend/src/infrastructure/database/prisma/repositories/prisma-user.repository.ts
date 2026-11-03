import { Injectable } from '@nestjs/common';
import { User } from '../../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../../domain/users/repositories/user.repository';
import { UserMapper } from '../mappers/user.mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    return record ? UserMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email },
    });

    return record ? UserMapper.toDomain(record) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } });

    return count > 0;
  }

  async existsAny(): Promise<boolean> {
    const count = await this.prisma.user.count();

    return count > 0;
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({ data: UserMapper.toCreateData(user) });
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: UserMapper.toUpdateData(user),
    });
  }
}
