import { Injectable } from '@nestjs/common';
import {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({
      data: RefreshTokenMapper.toCreateData(input),
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async revoke(id: string, replacedBy: string | null): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), replacedBy },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(before: Date): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: before } },
    });
  }
}
