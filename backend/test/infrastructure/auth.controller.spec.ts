import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticateUserUseCase } from '../../src/application/auth/use-cases/authenticate-user.use-case';
import type { GetUserProfileUseCase } from '../../src/application/auth/use-cases/get-user-profile.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { User } from '../../src/domain/users/entities/user.entity';
import type { LoginRateLimiter } from '../../src/infrastructure/auth/login-rate-limiter.service';
import type { TokenService } from '../../src/infrastructure/auth/token.service';
import { AuthController } from '../../src/infrastructure/http/controllers/auth.controller';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeUser(): User {
  return User.restore({
    id: USER_ID,
    username: 'fernando',
    passwordHash: PASSWORD_HASH,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function createController() {
  const authenticate = vi.fn();
  const getProfile = vi.fn();
  const sign = vi.fn().mockReturnValue({ token: 'jwt', expiresAt: 123 });
  const assertAllowed = vi.fn();
  const registerSuccess = vi.fn();
  const registerFailure = vi.fn();

  const controller = new AuthController(
    { execute: authenticate } as unknown as AuthenticateUserUseCase,
    { execute: getProfile } as unknown as GetUserProfileUseCase,
    { sign, expiresInSeconds: 3600 } as unknown as TokenService,
    {
      assertAllowed,
      registerSuccess,
      registerFailure,
    } as unknown as LoginRateLimiter,
  );

  return {
    controller,
    authenticate,
    getProfile,
    sign,
    assertAllowed,
    registerSuccess,
    registerFailure,
  };
}

describe('AuthController', () => {
  it('autentica, assina o token com o id e devolve o usuário', async () => {
    const { controller, authenticate, sign, registerSuccess } =
      createController();

    authenticate.mockResolvedValue(makeUser());

    const result = await controller.login({
      username: 'fernando',
      password: 'senha',
    });

    expect(sign).toHaveBeenCalledWith(USER_ID);
    expect(result).toEqual({
      accessToken: 'jwt',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: 123,
      user: { id: USER_ID, username: 'fernando' },
    });
    expect(registerSuccess).toHaveBeenCalledOnce();
  });

  it('registra falha e relança quando as credenciais são inválidas', async () => {
    const { controller, authenticate, registerFailure } = createController();

    authenticate.mockRejectedValue(new UnauthorizedError());

    await expect(
      controller.login({ username: 'fernando', password: 'errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(registerFailure).toHaveBeenCalledOnce();
  });

  it('bloqueia antes de autenticar quando o limite é atingido', async () => {
    const { controller, assertAllowed, authenticate, registerFailure } =
      createController();

    assertAllowed.mockImplementation(() => {
      throw new HttpException(
        'Muitas tentativas',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    });

    await expect(
      controller.login({ username: 'fernando', password: 'senha' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(authenticate).not.toHaveBeenCalled();
    expect(registerFailure).not.toHaveBeenCalled();
  });

  it('devolve o perfil do usuário do token', async () => {
    const { controller, getProfile } = createController();

    getProfile.mockResolvedValue(makeUser());

    const result = await controller.me(USER_ID);

    expect(result).toEqual({ id: USER_ID, username: 'fernando' });
    expect(getProfile).toHaveBeenCalledWith(USER_ID);
  });
});
