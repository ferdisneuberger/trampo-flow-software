import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { HealthController } from '../../src/infrastructure/http/controllers/health.controller';

function createController(queryRaw: () => Promise<unknown>) {
  return new HealthController({
    $queryRaw: queryRaw,
  } as unknown as PrismaService);
}

describe('HealthController', () => {
  it('reporta ok quando o banco responde', async () => {
    const controller = createController(
      vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    );

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('devolve 503 quando o banco está indisponível', async () => {
    const controller = createController(
      vi.fn().mockRejectedValue(new Error('connection refused')),
    );

    await expect(controller.check()).rejects.toBeInstanceOf(HttpException);
    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
    });
  });
});
