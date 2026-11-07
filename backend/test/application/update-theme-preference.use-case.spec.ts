import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateThemePreferenceUseCase } from '../../src/application/auth/use-cases/update-theme-preference.use-case';
import { User } from '../../src/domain/users/entities/user.entity';
import { ThemePreference } from '../../src/domain/users/enums/theme-preference.enum';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeUser(): User {
  return User.create({
    email: 'pessoa@exemplo.com',
    passwordHash: PASSWORD_HASH,
  });
}

describe('UpdateThemePreferenceUseCase', () => {
  let repository: InMemoryUserRepository;
  let useCase: UpdateThemePreferenceUseCase;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new UpdateThemePreferenceUseCase(repository);
  });

  it('atualiza e persiste a preferência de tema', async () => {
    const user = makeUser();
    await repository.create(user);

    const updated = await useCase.execute({
      userId: user.id,
      themePreference: ThemePreference.DARK,
    });

    expect(updated.themePreference).toBe(ThemePreference.DARK);
    expect((await repository.findById(user.id))?.themePreference).toBe(
      ThemePreference.DARK,
    );
  });

  it('rejeita usuário inexistente', async () => {
    await expect(
      useCase.execute({
        userId: '00000000-0000-0000-0000-000000000000',
        themePreference: ThemePreference.DARK,
      }),
    ).rejects.toMatchObject({ name: 'UnauthorizedError' });
  });
});
