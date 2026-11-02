import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { PrismaRefreshTokenRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-refresh-token.repository';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateRefreshTokenData,
} from '../helpers/test-database';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const FAMILY_ID = '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

describe.skipIf(!TEST_DATABASE_URL)('PrismaRefreshTokenRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaRefreshTokenRepository;

  beforeAll(async () => {
    prisma = await createTestPrisma();

    const now = new Date();

    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {},
      create: {
        id: USER_ID,
        username: 'refresh-token-user',
        passwordHash: PASSWORD_HASH,
        createdAt: now,
        updatedAt: now,
      },
    });

    repository = new PrismaRefreshTokenRepository(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateRefreshTokenData(prisma);
  });

  function tokenInput(overrides: Record<string, unknown> = {}) {
    return {
      id: '4f1d2c3b-5a60-4e7f-8a9b-0c1d2e3f4a5b',
      userId: USER_ID,
      tokenHash: 'a'.repeat(64),
      familyId: FAMILY_ID,
      expiresAt: new Date(Date.now() + 60_000),
      userAgent: 'vitest',
      ...overrides,
    };
  }

  it('cria e encontra pelo hash', async () => {
    await repository.create(tokenInput());

    const stored = await repository.findByHash('a'.repeat(64));

    expect(stored?.userId).toBe(USER_ID);
    expect(stored?.familyId).toBe(FAMILY_ID);
    expect(stored?.revokedAt).toBeNull();
  });

  it('devolve null para hash desconhecido', async () => {
    await expect(repository.findByHash('b'.repeat(64))).resolves.toBeNull();
  });

  it('revoga um token e registra o substituto', async () => {
    await repository.create(tokenInput());

    await repository.revoke(
      '4f1d2c3b-5a60-4e7f-8a9b-0c1d2e3f4a5b',
      '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
    );

    const stored = await repository.findByHash('a'.repeat(64));

    expect(stored?.revokedAt).toBeInstanceOf(Date);
    expect(stored?.replacedBy).toBe('9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f');
  });

  it('revoga a família inteira', async () => {
    await repository.create(tokenInput());
    await repository.create(
      tokenInput({
        id: '5a2e3d4c-6b71-4f80-9b0c-1d2e3f4a5b6c',
        tokenHash: 'c'.repeat(64),
      }),
    );

    await repository.revokeFamily(FAMILY_ID);

    const first = await repository.findByHash('a'.repeat(64));
    const second = await repository.findByHash('c'.repeat(64));

    expect(first?.revokedAt).toBeInstanceOf(Date);
    expect(second?.revokedAt).toBeInstanceOf(Date);
  });

  it('remove apenas tokens expirados', async () => {
    await repository.create(tokenInput());
    await repository.create(
      tokenInput({
        id: '5a2e3d4c-6b71-4f80-9b0c-1d2e3f4a5b6c',
        tokenHash: 'c'.repeat(64),
        expiresAt: new Date(0),
      }),
    );

    await repository.deleteExpired(new Date());

    await expect(repository.findByHash('a'.repeat(64))).resolves.not.toBeNull();
    await expect(repository.findByHash('c'.repeat(64))).resolves.toBeNull();
  });
});
