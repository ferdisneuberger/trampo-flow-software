import { Injectable } from '@nestjs/common';
import { AuthToken } from '../../../../domain/auth/entities/auth-token.entity';
import type { AuthTokenType } from '../../../../domain/auth/enums/auth-token-type.enum';
import { AuthTokenRepository } from '../../../../domain/auth/repositories/auth-token.repository';
import { AuthTokenMapper } from '../mappers/auth-token.mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaAuthTokenRepository implements AuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: AuthToken): Promise<void> {
    await this.prisma.authToken.create({
      data: AuthTokenMapper.toCreateData(token),
    });
  }

  async findByHash(tokenHash: string): Promise<AuthToken | null> {
    const record = await this.prisma.authToken.findUnique({
      where: { tokenHash },
    });

    return record ? AuthTokenMapper.toDomain(record) : null;
  }

  async findLatestByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<AuthToken | null> {
    const record = await this.prisma.authToken.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });

    return record ? AuthTokenMapper.toDomain(record) : null;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await this.prisma.authToken.update({
      where: { id },
      data: { usedAt },
    });
  }

  async deleteByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<void> {
    await this.prisma.authToken.deleteMany({
      where: { userId, type },
    });
  }
}
