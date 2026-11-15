import { Injectable } from '@nestjs/common';
import { OAuthCodeRepository } from '../../../../domain/oauth/repositories/oauth-code.repository';
import type { OAuthCodeRecord } from '../../../../domain/oauth/records';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaOAuthCodeRepository implements OAuthCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(code: OAuthCodeRecord): Promise<void> {
    await this.prisma.oAuthCode.create({ data: code });
  }

  findByHash(codeHash: string): Promise<OAuthCodeRecord | null> {
    return this.prisma.oAuthCode.findUnique({ where: { codeHash } });
  }

  async markUsed(id: string, at: Date): Promise<boolean> {
    // `usedAt: null` no WHERE torna a troca atômica.
    const result = await this.prisma.oAuthCode.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at },
    });

    return result.count === 1;
  }

  async deleteExpiredBefore(before: Date): Promise<number> {
    const result = await this.prisma.oAuthCode.deleteMany({
      where: { expiresAt: { lt: before } },
    });

    return result.count;
  }
}
