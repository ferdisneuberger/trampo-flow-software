import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../src/application/shared/errors/forbidden.error';
import { ResetPasswordUseCase } from '../../src/application/auth/use-cases/reset-password.use-case';
import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { PasswordHasher } from '../../src/domain/users/services/password-hasher';
import { InMemoryAuthTokenRepository } from '../repositories/in-memory-auth-token.repository';
import { InMemoryRefreshTokenRepository } from '../repositories/in-memory-refresh-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const NEW_PASSWORD_HASH = 'scrypt$16384$8$1$bm92bw==$bmV3';
const TOKEN = 'reset-token';

async function setup(
  options: {
    noPassword?: boolean;
    expiresAt?: Date;
    type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  } = {},
) {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryAuthTokenRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const user = options.noPassword
    ? User.restore({
        id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
        email: 'pessoa@exemplo.com',
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        verificationSentAt: null,
        termsAcceptedAt: null,
        termsVersion: null,
        username: null,
        passwordHash: null,
        lastLoginAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
    : User.create({ email: 'pessoa@exemplo.com', passwordHash: PASSWORD_HASH });

  await users.create(user);

  const token = AuthToken.create({
    userId: user.id,
    type: options.type ?? 'PASSWORD_RESET',
    tokenHash: `hash:${TOKEN}`,
    expiresAt: options.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
  });
  await tokens.create(token);

  await refreshTokens.create({
    id: 'refresh-1',
    userId: user.id,
    tokenHash: 'refresh-hash-1',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: null,
  });
  await refreshTokens.create({
    id: 'refresh-2',
    userId: user.id,
    tokenHash: 'refresh-hash-2',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: null,
  });

  const passwordHasher = {
    hash: vi.fn().mockResolvedValue(NEW_PASSWORD_HASH),
    verify: vi.fn(),
  } as unknown as PasswordHasher;
  const tokenHasher = {
    hash: vi.fn((value: string) => `hash:${value}`),
  } as unknown as TokenHasher;

  const useCase = new ResetPasswordUseCase(
    users,
    tokens,
    refreshTokens,
    passwordHasher,
    tokenHasher,
  );

  return { useCase, users, tokens, refreshTokens, user, token, passwordHasher };
}

describe('ResetPasswordUseCase', () => {
  it('troca a senha, consome o token e revoga as sessões', async () => {
    const context = await setup();

    await context.useCase.execute({
      token: TOKEN,
      password: 'senha-nova-segura',
    });

    const stored = await context.users.findById(context.user.id);
    const token = await context.tokens.findByHash(`hash:${TOKEN}`);

    expect(stored?.passwordHash).toBe(NEW_PASSWORD_HASH);
    expect(token?.usedAt).toBeInstanceOf(Date);
    expect(
      context.refreshTokens
        .findAll()
        .every((record) => record.revokedAt !== null),
    ).toBe(true);
  });

  it('recusa token expirado', async () => {
    const context = await setup({ expiresAt: new Date(Date.now() - 1000) });

    await expect(
      context.useCase.execute({ token: TOKEN, password: 'senha-nova-segura' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });

  it('recusa token já usado', async () => {
    const context = await setup();
    await context.tokens.markUsed(context.token.id, new Date());

    await expect(
      context.useCase.execute({ token: TOKEN, password: 'senha-nova-segura' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });

  it('recusa token de outro tipo', async () => {
    const context = await setup({ type: 'EMAIL_VERIFICATION' });

    await expect(
      context.useCase.execute({ token: TOKEN, password: 'senha-nova-segura' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });

  it('recusa conta sem senha', async () => {
    const context = await setup({ noPassword: true });

    await expect(
      context.useCase.execute({ token: TOKEN, password: 'senha-nova-segura' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('recusa senha fora da política sem consumir o token', async () => {
    const context = await setup();

    await expect(
      context.useCase.execute({ token: TOKEN, password: 'curta' }),
    ).rejects.toBeInstanceOf(DomainError);

    const token = await context.tokens.findByHash(`hash:${TOKEN}`);
    expect(token?.usedAt).toBeNull();
  });

  it('recusa token inválido', async () => {
    const context = await setup();

    await expect(
      context.useCase.execute({ token: 'xxx', password: 'senha-nova-segura' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });
});
