import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type OAuthGrant } from '@prisma/client';
import { OAuthGrantRepository } from '../../../../domain/oauth/repositories/oauth-grant.repository';
import type { OAuthGrantRecord } from '../../../../domain/oauth/records';
import { PrismaService } from '../prisma.service';

const toRecord = (row: OAuthGrant): OAuthGrantRecord => ({ ...row });

@Injectable()
export class PrismaOAuthGrantRepository implements OAuthGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async activate(input: {
    userId: string;
    clientRef: string;
    scope: string;
    resource: string;
  }): Promise<OAuthGrantRecord> {
    const where = {
      userId: input.userId,
      clientRef: input.clientRef,
      revokedAt: null,
    };
    const update = async () => {
      const existing = await this.prisma.oAuthGrant.findFirst({ where });

      return existing
        ? this.prisma.oAuthGrant.update({
            where: { id: existing.id },
            data: { scope: input.scope, resource: input.resource },
          })
        : null;
    };

    const reused = await update();

    if (reused) {
      return toRecord(reused);
    }

    try {
      return toRecord(
        await this.prisma.oAuthGrant.create({
          data: { id: randomUUID(), ...input },
        }),
      );
    } catch (error) {
      // Corrida: outra requisição criou o grant ativo entre o find e o create
      // (o índice único parcial barrou). Reaproveita o dela.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await update();

        if (raced) {
          return toRecord(raced);
        }
      }

      throw error;
    }
  }

  async findById(id: string): Promise<OAuthGrantRecord | null> {
    const row = await this.prisma.oAuthGrant.findUnique({ where: { id } });

    return row ? toRecord(row) : null;
  }

  async listActiveByUser(userId: string): Promise<OAuthGrantRecord[]> {
    const rows = await this.prisma.oAuthGrant.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toRecord);
  }

  async revokeForUser(id: string, userId: string, at: Date): Promise<boolean> {
    const result = await this.prisma.oAuthGrant.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: at },
    });

    return result.count > 0;
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.prisma.oAuthGrant.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    await this.prisma.oAuthGrant.updateMany({
      where: { id },
      data: { lastUsedAt: at },
    });
  }
}
