import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticateUserUseCase } from '../../src/application/auth/use-cases/authenticate-user.use-case';
import type { CreateSessionUseCase } from '../../src/application/auth/use-cases/create-session.use-case';
import type { GetUserProfileUseCase } from '../../src/application/auth/use-cases/get-user-profile.use-case';
import type { LogoutUseCase } from '../../src/application/auth/use-cases/logout.use-case';
import type { RefreshSessionUseCase } from '../../src/application/auth/use-cases/refresh-session.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { User } from '../../src/domain/users/entities/user.entity';
import type { LoginRateLimiter } from '../../src/infrastructure/auth/login-rate-limiter.service';
import type { TokenService } from '../../src/infrastructure/auth/token.service';
import { AuthController } from '../../src/infrastructure/http/controllers/auth.controller';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const REFRESH_EXPIRES_AT = new Date('2026-12-01T00:00:00.000Z');

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

function makeRequest(
  overrides: { cookies?: Record<string, string>; origin?: string } = {},
): FastifyRequest {
  return {
    headers: {
      'user-agent': 'vitest',
      ...(overrides.origin ? { origin: overrides.origin } : {}),
    },
    cookies: overrides.cookies ?? {},
  } as unknown as FastifyRequest;
}

function makeReply() {
  const setCookie = vi.fn();
  const clearCookie = vi.fn();

  return {
    setCookie,
    clearCookie,
    reply: { setCookie, clearCookie } as unknown as FastifyReply,
  };
}

function createController() {
  const authenticate = vi.fn();
  const createSession = vi.fn();
  const refreshSession = vi.fn();
  const logoutSession = vi.fn();
  const getProfile = vi.fn();
  const sign = vi.fn().mockReturnValue({ token: 'jwt', expiresAt: 123 });
  const assertAllowed = vi.fn();
  const registerSuccess = vi.fn();
  const registerFailure = vi.fn();
  const config = {
    get: (key: string) =>
      ({ NODE_ENV: 'test', CORS_ORIGINS: 'https://app.test' })[key],
  } as unknown as ConfigService;

  const controller = new AuthController(
    { execute: authenticate } as unknown as AuthenticateUserUseCase,
    { execute: createSession } as unknown as CreateSessionUseCase,
    { execute: refreshSession } as unknown as RefreshSessionUseCase,
    { execute: logoutSession } as unknown as LogoutUseCase,
    { execute: getProfile } as unknown as GetUserProfileUseCase,
    { sign, expiresInSeconds: 3600 } as unknown as TokenService,
    {
      assertAllowed,
      registerSuccess,
      registerFailure,
    } as unknown as LoginRateLimiter,
    config,
  );

  return {
    controller,
    authenticate,
    createSession,
    refreshSession,
    logoutSession,
    getProfile,
    sign,
    assertAllowed,
    registerSuccess,
    registerFailure,
  };
}

describe('AuthController', () => {
  it('autentica, cria sessão, grava o cookie e devolve o access token', async () => {
    const { controller, authenticate, createSession, sign, registerSuccess } =
      createController();
    const { reply, setCookie } = makeReply();

    authenticate.mockResolvedValue(makeUser());
    createSession.mockResolvedValue({
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: REFRESH_EXPIRES_AT,
    });

    const result = await controller.login(
      { username: 'fernando', password: 'senha' },
      makeRequest(),
      reply,
    );

    expect(sign).toHaveBeenCalledWith(USER_ID);
    expect(setCookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        expires: REFRESH_EXPIRES_AT,
      }),
    );
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
    const { reply } = makeReply();

    authenticate.mockRejectedValue(new UnauthorizedError());

    await expect(
      controller.login(
        { username: 'fernando', password: 'errada' },
        makeRequest(),
        reply,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(registerFailure).toHaveBeenCalledOnce();
  });

  it('bloqueia antes de autenticar quando o limite é atingido', async () => {
    const { controller, assertAllowed, authenticate } = createController();
    const { reply } = makeReply();

    assertAllowed.mockImplementation(() => {
      throw new HttpException(
        'Muitas tentativas',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    });

    await expect(
      controller.login(
        { username: 'fernando', password: 'senha' },
        makeRequest(),
        reply,
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('renova a sessão e rotaciona o cookie', async () => {
    const { controller, refreshSession } = createController();
    const { reply, setCookie } = makeReply();

    refreshSession.mockResolvedValue({
      userId: USER_ID,
      refreshToken: 'novo-refresh',
      refreshTokenExpiresAt: REFRESH_EXPIRES_AT,
    });

    const result = await controller.refresh(
      makeRequest({ cookies: { refresh_token: 'refresh-antigo' } }),
      reply,
    );

    expect(refreshSession).toHaveBeenCalledWith({
      refreshToken: 'refresh-antigo',
      userAgent: 'vitest',
    });
    expect(setCookie).toHaveBeenCalledWith(
      'refresh_token',
      'novo-refresh',
      expect.any(Object),
    );
    expect(result).toEqual({
      accessToken: 'jwt',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: 123,
    });
  });

  it('rejeita refresh sem cookie', async () => {
    const { controller, refreshSession } = createController();
    const { reply } = makeReply();

    await expect(
      controller.refresh(makeRequest(), reply),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('revoga a sessão e limpa o cookie no logout', async () => {
    const { controller, logoutSession } = createController();
    const { reply, clearCookie } = makeReply();

    logoutSession.mockResolvedValue(undefined);

    await controller.logout(
      makeRequest({ cookies: { refresh_token: 'refresh-token' } }),
      reply,
    );

    expect(logoutSession).toHaveBeenCalledWith('refresh-token');
    expect(clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/' });
  });

  it('recusa origem não permitida no refresh', async () => {
    const { controller, refreshSession } = createController();
    const { reply } = makeReply();

    await expect(
      controller.refresh(
        makeRequest({
          cookies: { refresh_token: 'token' },
          origin: 'https://malicioso.test',
        }),
        reply,
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('devolve o perfil do usuário do token', async () => {
    const { controller, getProfile } = createController();

    getProfile.mockResolvedValue(makeUser());

    await expect(controller.me(USER_ID)).resolves.toEqual({
      id: USER_ID,
      username: 'fernando',
    });
  });
});
