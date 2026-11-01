import { describe, expect, it } from 'vitest';
import { GetUserProfileUseCase } from '../../src/application/auth/use-cases/get-user-profile.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

describe('GetUserProfileUseCase', () => {
  it('devolve o usuário do token', async () => {
    const repository = new InMemoryUserRepository();
    const user = User.create({
      username: 'fernando',
      passwordHash: PASSWORD_HASH,
    });

    await repository.create(user);

    const profile = await new GetUserProfileUseCase(repository).execute(
      user.id,
    );

    expect(profile.username).toBe('fernando');
  });

  it('rejeita quando o usuário foi removido', async () => {
    const repository = new InMemoryUserRepository();

    await expect(
      new GetUserProfileUseCase(repository).execute(
        '00000000-0000-0000-0000-000000000000',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
