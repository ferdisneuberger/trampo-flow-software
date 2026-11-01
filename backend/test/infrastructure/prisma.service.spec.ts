import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import {
  assertTestDatabaseUrl,
  TEST_DATABASE_URL,
} from '../helpers/test-database';

describe.skipIf(!TEST_DATABASE_URL)('PrismaService', () => {
  it('conecta no init e desconecta no destroy', async () => {
    process.env.DATABASE_URL = assertTestDatabaseUrl(TEST_DATABASE_URL);

    const prisma = new PrismaService();

    await prisma.onModuleInit();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();

    await prisma.onModuleDestroy();
  });
});
