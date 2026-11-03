import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import { User } from '../../src/domain/users/entities/user.entity';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { PrismaAuthTokenRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-auth-token.repository';
import { PrismaUserRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-user.repository';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateUserData,
} from '../helpers/test-database';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

describe.skipIf(!TEST_DATABASE_URL)('PrismaAuthTokenRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaAuthTokenRepository;
  let userRepository: PrismaUserRepository;

  beforeAll(async () => {
    prisma = await createTestPrisma();
    repository = new PrismaAuthTokenRepository(prisma);
    userRepository = new PrismaUserRepository(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateUserData(prisma);
  });

  async function createUser() {
    const user = User.create({
      email: 'token@example.com',
      passwordHash: PASSWORD_HASH,
    });

    await userRepository.create(user);

    return user;
  }

  function makeToken(userId: string) {
    return AuthToken.create({
      userId,
      type: 'EMAIL_VERIFICATION',
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  it('persiste e busca pelo hash', async () => {
    const user = await createUser();
    const token = makeToken(user.id);

    await repository.create(token);

    const stored = await repository.findByHash(token.tokenHash);

    expect(stored?.id).toBe(token.id);
    expect(stored?.userId).toBe(user.id);
    expect(stored?.type).toBe('EMAIL_VERIFICATION');
    expect(stored?.usedAt).toBeNull();
  });

  it('marca como usado', async () => {
    const user = await createUser();
    const token = makeToken(user.id);
    const usedAt = new Date('2026-05-01T12:00:00.000Z');

    await repository.create(token);
    await repository.markUsed(token.id, usedAt);

    const stored = await repository.findByHash(token.tokenHash);

    expect(stored?.usedAt).toEqual(usedAt);
  });

  it('remove tokens do usuário por tipo', async () => {
    const user = await createUser();
    const token = makeToken(user.id);

    await repository.create(token);
    await repository.deleteByUserAndType(user.id, 'EMAIL_VERIFICATION');

    await expect(repository.findByHash(token.tokenHash)).resolves.toBeNull();
  });
});
