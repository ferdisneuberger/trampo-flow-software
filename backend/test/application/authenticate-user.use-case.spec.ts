import { describe, expect, it, vi } from 'vitest';
import { AuthenticateUserUseCase } from '../../src/application/auth/use-cases/authenticate-user.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { User } from '../../src/domain/users/entities/user.entity';
import type { PasswordHasher } from '../../src/domain/users/services/password-hasher';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const EMAIL = 'fernando@example.com';

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
    email: EMAIL,
    passwordHash: PASSWORD_HASH,
  });

  if (options.withUser ?? true) {
    await repository.create(user);
  }

  const { hasher, hash, verify } = createHasher(options.valid ?? true);
  const useCase = new AuthenticateUserUseCase(repository, hasher);
  const findSpy = vi.spyOn(repository, 'findByEmail');

  return { useCase, repository, user, hash, verify, findSpy };
}

describe('AuthenticateUserUseCase', () => {
  it('autentica e registra o último login', async () => {
    const { useCase, repository, user } = await setup();

    const authenticated = await useCase.execute({
      email: EMAIL,
      password: 'senha-super-secreta',
    });

    expect(authenticated.id).toBe(user.id);
    expect(authenticated.lastLoginAt).toBeInstanceOf(Date);

    const stored = await repository.findById(user.id);
    expect(stored?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('normaliza o e-mail antes de buscar', async () => {
    const { useCase, findSpy } = await setup();

    await useCase.execute({
      email: '  FERNANDO@EXAMPLE.COM  ',
      password: 'senha',
    });

    expect(findSpy).toHaveBeenCalledWith(EMAIL);
  });

  it('recusa senha errada', async () => {
    const { useCase } = await setup({ valid: false });

    await expect(
      useCase.execute({ email: EMAIL, password: 'errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('recusa usuário inexistente com a mesma mensagem', async () => {
    const { useCase } = await setup({ withUser: false });

    await expect(
      useCase.execute({ email: 'ninguem@example.com', password: 'senha' }),
    ).rejects.toMatchObject({
      message: 'Usuário ou senha inválidos.',
      code: 'UNAUTHORIZED',
    });
  });

  it('recusa usuário somente Google sem senha', async () => {
    const repository = new InMemoryUserRepository();
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const user = User.restore({
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      email: EMAIL,
      emailVerifiedAt: createdAt,
      verificationSentAt: null,
      termsAcceptedAt: null,
      termsVersion: null,
      username: null,
      googleId: null,
      passwordHash: null,
      lastLoginAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    const { hasher, verify } = createHasher();
    const useCase = new AuthenticateUserUseCase(repository, hasher);

    await repository.create(user);

    await expect(
      useCase.execute({ email: EMAIL, password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(verify).toHaveBeenCalledOnce();
  });

  it('executa hash descartável quando o usuário não existe', async () => {
    const { useCase, hash, verify } = await setup({ withUser: false });

    await expect(
      useCase.execute({ email: 'ninguem@example.com', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(hash).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledOnce();
  });

  it('reaproveita o hash descartável entre tentativas', async () => {
    const { useCase, hash } = await setup({ withUser: false });

    await expect(
      useCase.execute({ email: 'ninguem@example.com', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      useCase.execute({ email: 'outro@example.com', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(hash).toHaveBeenCalledOnce();
  });

  it('não consulta o banco quando o e-mail é inválido', async () => {
    const { useCase, findSpy } = await setup();

    await expect(
      useCase.execute({ email: 'nao-e-email', password: 'senha' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(findSpy).not.toHaveBeenCalled();
  });
});
