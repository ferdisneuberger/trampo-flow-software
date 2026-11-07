import { execFileSync } from 'node:child_process';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Recusa rodar contra qualquer banco que não termine em `_test`, para que um
 * TEST_DATABASE_URL copiado por engano não apague dados de desenvolvimento.
 */
export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('TEST_DATABASE_URL não está definida.');
  }

  const database = new URL(url).pathname.replace(/^\//, '');

  if (!database.endsWith('_test')) {
    throw new Error(
      `Recusando rodar contra "${database}": o banco de teste precisa terminar em _test.`,
    );
  }

  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL e DATABASE_URL não podem ser iguais.');
  }

  return url;
}

export async function createTestPrisma(): Promise<PrismaService> {
  const url = assertTestDatabaseUrl(TEST_DATABASE_URL);

  process.env.DATABASE_URL = url;

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });

  const prisma = new PrismaService();

  await prisma.$connect();

  return prisma;
}

export async function truncateApplicationData(
  prisma: PrismaService,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "applications" RESTART IDENTITY CASCADE',
  );
}

export async function truncateUserData(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE',
  );
}

export async function truncateRefreshTokenData(
  prisma: PrismaService,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "refresh_tokens" RESTART IDENTITY CASCADE',
  );
}
