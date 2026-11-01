import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../../src/infrastructure/auth/auth.service';
import type { AuthenticatedRequest } from '../../src/infrastructure/auth/jwt-auth.guard';
import type { LoginRateLimiter } from '../../src/infrastructure/auth/login-rate-limiter.service';
import { AuthController } from '../../src/infrastructure/http/controllers/auth.controller';

function createController() {
  const login = vi.fn();
  const getProfile = vi.fn();
  const assertAllowed = vi.fn();
  const registerSuccess = vi.fn();
  const registerFailure = vi.fn();

  const controller = new AuthController(
    { login, getProfile } as unknown as AuthService,
    {
      assertAllowed,
      registerSuccess,
      registerFailure,
    } as unknown as LoginRateLimiter,
  );

  return {
    controller,
    login,
    getProfile,
    assertAllowed,
    registerSuccess,
    registerFailure,
  };
}

const loginResult = {
  accessToken: 'header.payload.signature',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  user: { username: 'fernando' },
};

describe('AuthController', () => {
  it('registra sucesso quando as credenciais são válidas', () => {
    const { controller, login, registerSuccess } = createController();

    login.mockReturnValue(loginResult);

    const result = controller.login({
      username: 'fernando',
      password: 'senha',
    });

    expect(result).toBe(loginResult);
    expect(registerSuccess).toHaveBeenCalledOnce();
  });

  it('registra falha e relança quando as credenciais são inválidas', () => {
    const { controller, login, registerFailure } = createController();

    login.mockImplementation(() => {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    });

    expect(() =>
      controller.login({ username: 'fernando', password: 'errada' }),
    ).toThrow(UnauthorizedException);
    expect(registerFailure).toHaveBeenCalledOnce();
  });

  it('bloqueia antes de autenticar quando o limite é atingido', () => {
    const { controller, assertAllowed, login, registerFailure } =
      createController();

    assertAllowed.mockImplementation(() => {
      throw new HttpException(
        'Muitas tentativas',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    });

    expect(() =>
      controller.login({ username: 'fernando', password: 'senha' }),
    ).toThrow(HttpException);
    expect(login).not.toHaveBeenCalled();
    expect(registerFailure).not.toHaveBeenCalled();
  });

  it('devolve o perfil do usuário do token', () => {
    const { controller, getProfile } = createController();

    getProfile.mockReturnValue({ username: 'fernando' });

    const result = controller.me({
      user: { sub: 'fernando' },
    } as unknown as AuthenticatedRequest);

    expect(result).toEqual({ username: 'fernando' });
    expect(getProfile).toHaveBeenCalledWith('fernando');
  });

  it('rejeita quando o token não trouxe usuário', () => {
    const { controller } = createController();

    expect(() => controller.me({} as unknown as AuthenticatedRequest)).toThrow(
      UnauthorizedException,
    );
  });
});
