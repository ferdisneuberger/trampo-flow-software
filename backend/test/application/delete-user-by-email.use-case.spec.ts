import { describe, expect, it } from 'vitest';
import { DeleteUserByEmailUseCase } from '../../src/application/auth/use-cases/delete-user-by-email.use-case';
import { NotFoundError } from '../../src/application/shared/errors/not-found.error';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const EMAIL = 'pessoa@exemplo.com';

describe('DeleteUserByEmailUseCase', () => {
  it('exclui o usuário pelo e-mail', async () => {
    const users = new InMemoryUserRepository();
    const user = User.create({ email: EMAIL, passwordHash: PASSWORD_HASH });

    await users.create(user);

    await new DeleteUserByEmailUseCase(users).execute({ email: EMAIL });

    expect(await users.findById(user.id)).toBeNull();
    expect(await users.findByEmail(EMAIL)).toBeNull();
  });

  it('recusa e-mail inválido', async () => {
    const users = new InMemoryUserRepository();

    await expect(
      new DeleteUserByEmailUseCase(users).execute({ email: 'nao-e-email' }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('devolve 404 para usuário inexistente', async () => {
    const users = new InMemoryUserRepository();

    await expect(
      new DeleteUserByEmailUseCase(users).execute({
        email: 'ninguem@exemplo.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
