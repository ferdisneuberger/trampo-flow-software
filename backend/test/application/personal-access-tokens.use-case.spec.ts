import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthenticatePersonalAccessTokenUseCase } from '../../src/application/auth/use-cases/authenticate-personal-access-token.use-case';
import {
  CreatePersonalAccessTokenUseCase,
  PERSONAL_ACCESS_TOKEN_MAX_ACTIVE,
} from '../../src/application/auth/use-cases/create-personal-access-token.use-case';
import { ListPersonalAccessTokensUseCase } from '../../src/application/auth/use-cases/list-personal-access-tokens.use-case';
import { RevokePersonalAccessTokenUseCase } from '../../src/application/auth/use-cases/revoke-personal-access-token.use-case';
import { NotFoundError } from '../../src/application/shared/errors/not-found.error';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { PersonalAccessToken } from '../../src/domain/auth/entities/personal-access-token.entity';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { CryptoPersonalAccessTokenGenerator } from '../../src/infrastructure/auth/crypto-personal-access-token-generator';
import { InMemoryPersonalAccessTokenRepository } from '../repositories/in-memory-personal-access-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

class Sha256Hasher extends TokenHasher {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const DAY = 24 * 60 * 60 * 1000;

describe('tokens de acesso pessoal', () => {
  let repository: InMemoryPersonalAccessTokenRepository;
  let users: InMemoryUserRepository;
  let hasher: Sha256Hasher;
  let create: CreatePersonalAccessTokenUseCase;
  let list: ListPersonalAccessTokensUseCase;
  let revoke: RevokePersonalAccessTokenUseCase;
  let authenticate: AuthenticatePersonalAccessTokenUseCase;
  let user: User;
  let otherUser: User;

  beforeEach(async () => {
    repository = new InMemoryPersonalAccessTokenRepository();
    users = new InMemoryUserRepository();
    hasher = new Sha256Hasher();
    create = new CreatePersonalAccessTokenUseCase(
      repository,
      new CryptoPersonalAccessTokenGenerator(),
      hasher,
    );
    list = new ListPersonalAccessTokensUseCase(repository);
    revoke = new RevokePersonalAccessTokenUseCase(repository);
    authenticate = new AuthenticatePersonalAccessTokenUseCase(
      repository,
      hasher,
      users,
    );
    user = User.create({
      email: 'pessoa@example.com',
      passwordHash: PASSWORD_HASH,
    });
    otherUser = User.create({
      email: 'outra@example.com',
      passwordHash: PASSWORD_HASH,
    });
    await users.create(user);
    await users.create(otherUser);
  });

  describe('CreatePersonalAccessTokenUseCase', () => {
    it('devolve o segredo tfp_ e guarda só o hash', async () => {
      const { token, secret } = await create.execute({
        userId: user.id,
        name: '  Claude Code  ',
      });

      expect(secret).toMatch(/^tfp_[A-Za-z0-9_-]{43}$/);
      expect(token.name).toBe('Claude Code');
      expect(token.prefix).toBe(secret.slice(0, 8));
      expect(token.tokenHash).toBe(hasher.hash(secret));
      expect(token.tokenHash).not.toContain(secret);

      const [stored] = await list.execute(user.id);
      expect(stored.tokenHash).toBe(hasher.hash(secret));
      expect(JSON.stringify(stored)).not.toContain(secret);
    });

    it('usa 90 dias por padrão e respeita expiresInDays', async () => {
      const before = Date.now();
      const { token: standard } = await create.execute({
        userId: user.id,
        name: 'a',
      });
      const { token: short } = await create.execute({
        userId: user.id,
        name: 'b',
        expiresInDays: 7,
      });

      expect(standard.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + 90 * DAY,
      );
      expect(short.expiresAt.getTime()).toBeLessThan(before + 8 * DAY);
    });

    it.each([0, 366, 1.5])('recusa validade de %s dias', async (days) => {
      await expect(
        create.execute({ userId: user.id, name: 'x', expiresInDays: days }),
      ).rejects.toBeInstanceOf(DomainError);
    });

    it('recusa nome vazio', async () => {
      await expect(
        create.execute({ userId: user.id, name: '   ' }),
      ).rejects.toBeInstanceOf(DomainError);
    });

    it('limita a quantidade de tokens ativos', async () => {
      for (let i = 0; i < PERSONAL_ACCESS_TOKEN_MAX_ACTIVE; i += 1) {
        await create.execute({ userId: user.id, name: `t${i}` });
      }

      await expect(
        create.execute({ userId: user.id, name: 'extra' }),
      ).rejects.toThrow(/Limite/);

      const [latest] = await list.execute(user.id);
      await revoke.execute({ userId: user.id, id: latest.id });

      await expect(
        create.execute({ userId: user.id, name: 'extra' }),
      ).resolves.toBeDefined();
    });
  });

  describe('permissões (escopo) do token', () => {
    it('usa leitura e escrita por padrão', async () => {
      const { token } = await create.execute({ userId: user.id, name: 'a' });

      expect(token.scope).toBe('applications:read applications:write');
      expect(token.scopes).toEqual(['applications:read', 'applications:write']);
    });

    it('cria token somente leitura e o autenticador devolve só a leitura', async () => {
      const { token, secret } = await create.execute({
        userId: user.id,
        name: 'relatório',
        scope: 'applications:read',
      });

      expect(token.scopes).toEqual(['applications:read']);
      await expect(authenticate.execute(secret)).resolves.toMatchObject({
        scopes: ['applications:read'],
      });
    });

    it.each([
      'applications:write',
      'applications:delete',
      'applications:read applications:write admin',
      '',
    ])('recusa a permissão "%s"', async (scope) => {
      await expect(
        create.execute({ userId: user.id, name: 'x', scope }),
      ).rejects.toBeInstanceOf(DomainError);
    });
  });

  describe('AuthenticatePersonalAccessTokenUseCase', () => {
    it('autentica um token válido e registra o uso', async () => {
      const { token, secret } = await create.execute({
        userId: user.id,
        name: 'mcp',
      });

      await expect(authenticate.execute(secret)).resolves.toEqual({
        userId: user.id,
        tokenId: token.id,
        scopes: ['applications:read', 'applications:write'],
      });

      const [stored] = await list.execute(user.id);
      expect(stored.lastUsedAt).not.toBeNull();
    });

    it('grava lastUsedAt no máximo uma vez por minuto', async () => {
      const { secret } = await create.execute({ userId: user.id, name: 'mcp' });

      await authenticate.execute(secret);
      await authenticate.execute(secret);
      await authenticate.execute(secret);

      expect(repository.touchCalls).toBe(1);
    });

    it('recusa segredo desconhecido', async () => {
      await expect(
        authenticate.execute('tfp_desconhecido'),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('recusa token revogado', async () => {
      const { token, secret } = await create.execute({
        userId: user.id,
        name: 'mcp',
      });
      await revoke.execute({ userId: user.id, id: token.id });

      await expect(authenticate.execute(secret)).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it('recusa token expirado', async () => {
      const secret = 'tfp_expirado';
      repository.set(
        PersonalAccessToken.restore({
          id: '9b1d7c3e-1111-4c1e-9a0e-2b6a4f5c8d10',
          userId: user.id,
          name: 'velho',
          tokenHash: hasher.hash(secret),
          prefix: 'tfp_expi',
          lastUsedAt: null,
          expiresAt: new Date(Date.now() - 1000),
          revokedAt: null,
          scope: 'applications:read applications:write',
          createdAt: new Date(Date.now() - 10 * DAY),
        }),
      );

      await expect(authenticate.execute(secret)).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it('recusa token de usuário que não existe mais', async () => {
      const { secret } = await create.execute({ userId: user.id, name: 'mcp' });
      await users.delete(user.id);

      await expect(authenticate.execute(secret)).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });
  });

  describe('RevokePersonalAccessTokenUseCase', () => {
    it('não revoga token de outro usuário (404)', async () => {
      const { token } = await create.execute({ userId: user.id, name: 'mcp' });

      await expect(
        revoke.execute({ userId: otherUser.id, id: token.id }),
      ).rejects.toBeInstanceOf(NotFoundError);

      const [stored] = await list.execute(user.id);
      expect(stored.isRevoked()).toBe(false);
    });

    it('é idempotente', async () => {
      const { token } = await create.execute({ userId: user.id, name: 'mcp' });

      await revoke.execute({ userId: user.id, id: token.id });
      const [first] = await list.execute(user.id);
      await revoke.execute({ userId: user.id, id: token.id });
      const [second] = await list.execute(user.id);

      expect(second.revokedAt).toEqual(first.revokedAt);
    });
  });

  it('lista só os tokens do próprio usuário', async () => {
    await create.execute({ userId: user.id, name: 'meu' });
    await create.execute({ userId: otherUser.id, name: 'alheio' });

    const tokens = await list.execute(user.id);

    expect(tokens.map((token) => token.name)).toEqual(['meu']);
  });
});
