import { Injectable } from '@nestjs/common';
import type { OAuthClient } from '@prisma/client';
import { OAuthClientRepository } from '../../../../domain/oauth/repositories/oauth-client.repository';
import type {
  OAuthClientRecord,
  OAuthClientSource,
} from '../../../../domain/oauth/records';
import { PrismaService } from '../prisma.service';

function toRecord(row: OAuthClient): OAuthClientRecord {
  return { ...row, source: row.source as OAuthClientSource };
}

@Injectable()
export class PrismaOAuthClientRepository implements OAuthClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(client: OAuthClientRecord): Promise<void> {
    await this.prisma.oAuthClient.create({ data: client });
  }

  async upsertCimd(
    client: Omit<OAuthClientRecord, 'lastUsedAt'>,
  ): Promise<OAuthClientRecord> {
    const row = await this.prisma.oAuthClient.upsert({
      where: { clientId: client.clientId },
      create: client,
      update: { name: client.name, redirectUris: client.redirectUris },
    });

    return toRecord(row);
  }

  async findByClientId(clientId: string): Promise<OAuthClientRecord | null> {
    const row = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    return row ? toRecord(row) : null;
  }

  async findByIds(ids: string[]): Promise<OAuthClientRecord[]> {
    const rows = await this.prisma.oAuthClient.findMany({
      where: { id: { in: ids } },
    });

    return rows.map(toRecord);
  }

  countBySource(source: OAuthClientSource): Promise<number> {
    return this.prisma.oAuthClient.count({ where: { source } });
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    await this.prisma.oAuthClient.updateMany({
      where: { id },
      data: { lastUsedAt: at },
    });
  }

  async deleteUnusedDcr(olderThan: Date): Promise<number> {
    const result = await this.prisma.oAuthClient.deleteMany({
      where: {
        source: 'dcr',
        createdAt: { lt: olderThan },
        grants: { none: {} },
      },
    });

    return result.count;
  }
}
