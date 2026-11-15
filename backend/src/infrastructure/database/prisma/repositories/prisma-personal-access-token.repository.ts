import { Injectable } from '@nestjs/common';
import { PersonalAccessToken } from '../../../../domain/auth/entities/personal-access-token.entity';
import { PersonalAccessTokenRepository } from '../../../../domain/auth/repositories/personal-access-token.repository';
import { PersonalAccessTokenMapper } from '../mappers/personal-access-token.mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaPersonalAccessTokenRepository implements PersonalAccessTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: PersonalAccessToken): Promise<void> {
    await this.prisma.personalAccessToken.create({
      data: PersonalAccessTokenMapper.toCreateData(token),
    });
  }

  async findByHash(tokenHash: string): Promise<PersonalAccessToken | null> {
    const record = await this.prisma.personalAccessToken.findUnique({
      where: { tokenHash },
    });

    return record ? PersonalAccessTokenMapper.toDomain(record) : null;
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<PersonalAccessToken | null> {
    const record = await this.prisma.personalAccessToken.findFirst({
      where: { id, userId },
    });

    return record ? PersonalAccessTokenMapper.toDomain(record) : null;
  }

  async listByUser(userId: string): Promise<PersonalAccessToken[]> {
    const records = await this.prisma.personalAccessToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => PersonalAccessTokenMapper.toDomain(record));
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.prisma.personalAccessToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt },
    });
  }

  async touchLastUsed(id: string, usedAt: Date): Promise<void> {
    await this.prisma.personalAccessToken.update({
      where: { id },
      data: { lastUsedAt: usedAt },
    });
  }
}
