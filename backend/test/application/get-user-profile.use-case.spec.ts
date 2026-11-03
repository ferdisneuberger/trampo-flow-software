import { describe, expect, it } from 'vitest';
import { AuthSettings } from '../../src/application/auth/services/auth-settings';
import { GetUserProfileUseCase } from '../../src/application/auth/use-cases/get-user-profile.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryAuthTokenRepository } from '../repositories/in-memory-auth-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeSettings(): AuthSettings {
  return new AuthSettings(
    true,
    24 * 60 * 60 * 1000,
    120 * 1000,
    '2026-11',
    'https://app.exemplo.com',
  );
}

describe('GetUserProfileUseCase', () => {
  it('devolve o usuário verificado sem cooldown', async () => {
    const users = new InMemoryUserRepository();
    const tokens = new InMemoryAuthTokenRepository();
    const user = User.create({
      email: 'fernando@example.com',
      passwordHash: PASSWORD_HASH,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await users.create(user);

    const profile = await new GetUserProfileUseCase(
      users,
      tokens,
      makeSettings(),
    ).execute(user.id);

    expect(profile.user.email).toBe('fernando@example.com');
    expect(profile.verificationResendAvailableAt).toBeNull();
  });

  it('calcula o cooldown do usuário não verificado', async () => {
    const users = new InMemoryUserRepository();
    const tokens = new InMemoryAuthTokenRepository();
    const user = User.create({
      email: 'fernando@example.com',
      passwordHash: PASSWORD_HASH,
    });
    const createdAt = new Date(Date.now() - 30_000);

    await users.create(user);
    await tokens.create(
      AuthToken.restore({
        id: '4f1d2c3b-5a60-4e7f-8a9b-0c1d2e3f4a5b',
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt,
      }),
    );

    const profile = await new GetUserProfileUseCase(
      users,
      tokens,
      makeSettings(),
    ).execute(user.id);

    expect(profile.verificationResendAvailableAt).toEqual(
      new Date(createdAt.getTime() + 120_000),
    );
  });

  it('rejeita quando o usuário foi removido', async () => {
    const users = new InMemoryUserRepository();
    const tokens = new InMemoryAuthTokenRepository();

    await expect(
      new GetUserProfileUseCase(users, tokens, makeSettings()).execute(
        '00000000-0000-0000-0000-000000000000',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
