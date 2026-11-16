import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PersonalAccessToken } from '../../src/domain/auth/entities/personal-access-token.entity';
import { User } from '../../src/domain/users/entities/user.entity';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { PrismaPersonalAccessTokenRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-personal-access-token.repository';
import { PrismaUserRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-user.repository';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateUserData,
} from '../helpers/test-database';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

describe.skipIf(!TEST_DATABASE_URL)(
  'PrismaPersonalAccessTokenRepository',
  () => {
    let prisma: PrismaService;
    let repository: PrismaPersonalAccessTokenRepository;
    let userRepository: PrismaUserRepository;

    beforeAll(async () => {
      prisma = await createTestPrisma();
      repository = new PrismaPersonalAccessTokenRepository(prisma);
      userRepository = new PrismaUserRepository(prisma);
    }, 60_000);

    afterAll(async () => {
      await prisma.$disconnect();
    });

    beforeEach(async () => {
      await truncateUserData(prisma);
    });

    async function createUser(email = 'pat@example.com') {
      const user = User.create({ email, passwordHash: PASSWORD_HASH });
      await userRepository.create(user);
      return user;
    }

    function makeToken(userId: string, hashChar = 'a') {
      return PersonalAccessToken.create({
        userId,
        name: 'Claude Code',
        tokenHash: hashChar.repeat(64),
        prefix: 'tfp_abcd',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    it('cria, busca pelo hash e por id com escopo de usuário', async () => {
      const user = await createUser();
      const other = await createUser('outra@example.com');
      const token = makeToken(user.id);

      await repository.create(token);

      expect((await repository.findByHash('a'.repeat(64)))?.id).toBe(token.id);
      expect((await repository.findById(token.id, user.id))?.name).toBe(
        'Claude Code',
      );
      expect(await repository.findById(token.id, other.id)).toBeNull();
    });

    it('lista, revoga e registra uso', async () => {
      const user = await createUser();
      const token = makeToken(user.id);
      await repository.create(token);

      const usedAt = new Date();
      await repository.touchLastUsed(token.id, usedAt);
      await repository.revoke(token.id, new Date());

      const [stored] = await repository.listByUser(user.id);
      expect(stored.lastUsedAt?.getTime()).toBe(usedAt.getTime());
      expect(stored.isRevoked()).toBe(true);
    });

    it('grava e devolve a permissão do token; linhas antigas ficam com leitura e escrita', async () => {
      const user = await createUser();
      const readOnly = PersonalAccessToken.create({
        userId: user.id,
        name: 'somente leitura',
        tokenHash: 'b'.repeat(64),
        prefix: 'tfp_read',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        scope: 'applications:read',
      });
      await repository.create(readOnly);
      await repository.create(makeToken(user.id));

      expect((await repository.findByHash('b'.repeat(64)))?.scopes).toEqual([
        'applications:read',
      ]);
      expect((await repository.findByHash('a'.repeat(64)))?.scope).toBe(
        'applications:read applications:write',
      );

      // Linha criada antes da coluna existir (sem escopo informado) usa o padrão.
      await prisma.$executeRawUnsafe(
        `INSERT INTO "personal_access_tokens" ("id","user_id","name","token_hash","prefix","expires_at")
       VALUES (gen_random_uuid(), '${user.id}', 'antigo', '${'c'.repeat(64)}', 'tfp_old1', now() + interval '1 day')`,
      );
      expect((await repository.findByHash('c'.repeat(64)))?.scope).toBe(
        'applications:read applications:write',
      );
    });

    it('apaga os tokens junto com o usuário', async () => {
      const user = await createUser();
      await repository.create(makeToken(user.id));

      await userRepository.delete(user.id);

      expect(await prisma.personalAccessToken.count()).toBe(0);
    });
  },
);
