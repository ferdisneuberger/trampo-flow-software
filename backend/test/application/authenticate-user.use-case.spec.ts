import { describe, expect, it, vi } from 'vitest';
import { AuthenticateUserUseCase } from '../../src/application/auth/use-cases/authenticate-user.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { User } from '../../src/domain/users/entities/user.entity';
import type { PasswordHasher } from '../../src/domain/users/services/password-hasher';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function createHasher(valid = true) {
  const hash = vi.fn().mockResolvedValue(PASSWORD_HASH);
  const verify = vi.fn().mockResolvedValue(valid);

  return {
    hash,
    verify,
    hasher: { hash, verify } as unknown as PasswordHasher,
  };
}

async function setup(options: { withUser?: boolean; valid?: boolean } = {}) {
  const repository = new InMemoryUserRepository();
  const user = User.create({
    username: 'fernando',
    passwordHash: PASSWORD_HASH,
  });

  if (options.withUser ?? true) {
    await repository.create(user);
  }

  const { hasher, hash, verify } = createHasher(options.valid ?? true);
  const useCase = new AuthenticateUserUseCase(repository, hasher);
  const findSpy = vi.spyOn(repository, 'findByUsername');

  return { useCase, repository, user, hash, verify, findSpy };
}

describe('AuthenticateUserUseCase', () => {
  it('autentica e registra o último login', async () => {
    const { useCase, repository, user } = await setup();

    const authenticated = await useCase.execute({
      username: 'fernando',
      password: 'senha-super-secreta',
    });

    expect(authenticated.id).toBe(user.id);
    expect(authenticated.lastLoginAt).toBeInstanceOf(Date);

    const stored = await repository.findById(user.id);
    expect(stored?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('normaliza o username antes de buscar', async () => {
    const { useCase, findSpy } = await setup();

    await useCase.execute({ username: '  Fernando  ', password: 'senha' });

    expect(findSpy).toHaveBeenCalledWith('fernando');
  });

  it('recusa senha errada', async () => {
    const { useCase } = await setup({ valid: false });

    await expect(
      useCase.execute({ username: 'fernando', password: 'errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('recusa usuário inexistente com a mesma mensagem', async () => {
    const { useCase } = await setup({ withUser: false });

    await expect(
      useCase.execute({ username: 'ninguem', password: 'senha' }),
    ).rejects.toMatchObject({
      message: 'Usuário ou senha inválidos.',
      code: 'UNAUTHORIZED',
    });
  });

  it('executa hash descartável quando o usuário não existe', async () => {
    const { useCase, hash, verify } = await setup({ withUser: false });

    await expect(
      useCase.execute({ username: 'ninguem', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(hash).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledOnce();
  });

  it('reaproveita o hash descartável entre tentativas', async () => {
    const { useCase, hash } = await setup({ withUser: false });

    await expect(
      useCase.execute({ username: 'ninguem', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      useCase.execute({ username: 'outro', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(hash).toHaveBeenCalledOnce();
  });

  it('não consulta o banco quando o username é longo demais', async () => {
    const { useCase, findSpy } = await setup();

    await expect(
      useCase.execute({ username: 'a'.repeat(121), password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(findSpy).not.toHaveBeenCalled();
  });
});
