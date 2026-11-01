import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { User } from '../../src/domain/users/entities/user.entity';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { PrismaUserRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-user.repository';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateUserData,
} from '../helpers/test-database';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeUser(username = 'fernando'): User {
  return User.create({ username, passwordHash: PASSWORD_HASH });
}

describe.skipIf(!TEST_DATABASE_URL)('PrismaUserRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaUserRepository;

  beforeAll(async () => {
    prisma = await createTestPrisma();
    repository = new PrismaUserRepository(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateUserData(prisma);
  });

  it('persiste e recupera por id e por username', async () => {
    const user = makeUser();

    await repository.create(user);

    const byId = await repository.findById(user.id);
    const byUsername = await repository.findByUsername('fernando');

    expect(byId?.id).toBe(user.id);
    expect(byUsername?.id).toBe(user.id);
    expect(byUsername?.passwordHash).toBe(PASSWORD_HASH);
    expect(byUsername?.lastLoginAt).toBeNull();
  });

  it('busca sem diferenciar maiúsculas e espaços', async () => {
    await repository.create(makeUser('fernando'));

    await expect(
      repository.findByUsername('  FERNANDO  '),
    ).resolves.not.toBeNull();
  });

  it('devolve null para username inexistente', async () => {
    await expect(repository.findByUsername('ninguem')).resolves.toBeNull();
  });

  it('responde existsById e existsAny', async () => {
    const user = makeUser();

    await expect(repository.existsAny()).resolves.toBe(false);

    await repository.create(user);

    await expect(repository.existsAny()).resolves.toBe(true);
    await expect(repository.existsById(user.id)).resolves.toBe(true);
    await expect(
      repository.existsById('00000000-0000-0000-0000-000000000000'),
    ).resolves.toBe(false);
  });

  it('grava o último login no update', async () => {
    const user = makeUser();
    const loginAt = new Date('2026-05-01T12:00:00.000Z');

    await repository.create(user);
    user.registerLogin(loginAt);
    await repository.update(user);

    const stored = await repository.findById(user.id);

    expect(stored?.lastLoginAt).toEqual(loginAt);
    expect(stored?.updatedAt).toEqual(loginAt);
  });

  it('recusa username duplicado ignorando maiúsculas', async () => {
    await repository.create(makeUser('fernando'));

    await expect(repository.create(makeUser('FERNANDO'))).rejects.toThrow();
  });

  it('propaga erro ao atualizar usuário inexistente', async () => {
    await expect(repository.update(makeUser())).rejects.toThrow();
  });
});
