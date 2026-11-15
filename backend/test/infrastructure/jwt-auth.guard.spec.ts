import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatePersonalAccessTokenUseCase } from '../../src/application/auth/use-cases/authenticate-personal-access-token.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import type { UserRepository } from '../../src/domain/users/repositories/user.repository';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../src/infrastructure/auth/jwt-auth.guard';
import { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';
import {
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
} from '../../src/domain/auth/scopes';
import { IS_PUBLIC_KEY } from '../../src/infrastructure/auth/public.decorator';
import { REQUIRED_SCOPE_KEY } from '../../src/infrastructure/auth/required-scope.decorator';
import { IS_SESSION_ONLY_KEY } from '../../src/infrastructure/auth/session-only.decorator';
import {
  TokenService,
  type JwtPayload,
} from '../../src/infrastructure/auth/token.service';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

const payload = {
  sub: USER_ID,
  iat: 1,
  exp: 2,
  iss: 'trampo-flow-api',
  aud: 'trampo-flow-web',
  jti: 'token-id',
} satisfies JwtPayload;

function createRequest(
  overrides: Partial<FastifyRequest> = {},
): AuthenticatedRequest {
  return {
    method: 'GET',
    headers: {},
    ...overrides,
  } as AuthenticatedRequest;
}

function createContext(
  request: AuthenticatedRequest,
  reply: { header: ReturnType<typeof vi.fn> } = { header: vi.fn() },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const TOKEN_ID = '0b6a8c1e-2222-4c1e-9a0e-2b6a4f5c8d10';

type GuardOptions = {
  /** `null` simula uma rota sem @RequiredScope. */
  requiredScope?: string | null;
  patScopes?: string[];
};

function createGuard(
  isPublic = false,
  isSessionOnly = false,
  options: GuardOptions = {},
) {
  const requiredScope =
    options.requiredScope === undefined
      ? SCOPE_APPLICATIONS_READ
      : (options.requiredScope ?? undefined);
  const reflector = {
    getAllAndOverride: vi.fn((key: string) =>
      key === IS_PUBLIC_KEY
        ? isPublic
        : key === IS_SESSION_ONLY_KEY
          ? isSessionOnly
          : key === REQUIRED_SCOPE_KEY
            ? requiredScope
            : undefined,
    ),
  };
  const tokenService = {
    verify: vi.fn(),
  };
  const userRepository = {
    existsById: vi.fn().mockResolvedValue(true),
  };
  const authenticatePat = {
    execute: vi.fn().mockResolvedValue({
      userId: USER_ID,
      tokenId: TOKEN_ID,
      scopes: options.patScopes ?? [
        SCOPE_APPLICATIONS_READ,
        SCOPE_APPLICATIONS_WRITE,
      ],
    }),
  };
  const rateLimiter = new RateLimiterService();
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    tokenService as unknown as TokenService,
    userRepository as unknown as UserRepository,
    authenticatePat as unknown as AuthenticatePersonalAccessTokenUseCase,
    rateLimiter,
  );

  return { guard, tokenService, userRepository, authenticatePat };
}

describe('JwtAuthGuard', () => {
  it('libera rotas públicas sem token', async () => {
    const { guard, tokenService } = createGuard(true);
    const request = createRequest();

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('libera preflight OPTIONS sem token', async () => {
    const { guard } = createGuard();
    const request = createRequest({ method: 'OPTIONS' });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('rejeita requisição sem Authorization', async () => {
    const { guard } = createGuard();

    await expect(
      guard.canActivate(createContext(createRequest())),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita esquema diferente de Bearer', async () => {
    const { guard } = createGuard();
    const request = createRequest({
      headers: { authorization: 'Basic token' },
    });

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('valida o token e confirma que o usuário existe', async () => {
    const { guard, tokenService, userRepository } = createGuard();
    const request = createRequest({
      headers: { authorization: 'Bearer token-valido' },
    });

    tokenService.verify.mockReturnValue(payload);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('token-valido');
    expect(userRepository.existsById).toHaveBeenCalledWith(USER_ID);
    expect(request.user).toEqual({ sub: USER_ID, authMethod: 'jwt' });
  });

  it('rejeita token de usuário que não existe mais', async () => {
    const { guard, tokenService, userRepository } = createGuard();
    const request = createRequest({
      headers: { authorization: 'Bearer token-valido' },
    });

    tokenService.verify.mockReturnValue(payload);
    userRepository.existsById.mockResolvedValue(false);

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('token de integração (tfp_)', () => {
    it('autentica pelo hash e marca o método como pat', async () => {
      const { guard, tokenService, authenticatePat } = createGuard();
      const request = createRequest({
        headers: { authorization: 'Bearer tfp_segredo' },
      });

      await expect(guard.canActivate(createContext(request))).resolves.toBe(
        true,
      );
      expect(authenticatePat.execute).toHaveBeenCalledWith('tfp_segredo');
      expect(tokenService.verify).not.toHaveBeenCalled();
      expect(request.user).toEqual({
        sub: USER_ID,
        authMethod: 'pat',
        tokenId: TOKEN_ID,
        scopes: [SCOPE_APPLICATIONS_READ, SCOPE_APPLICATIONS_WRITE],
      });
    });

    it('propaga a recusa de token revogado ou expirado', async () => {
      const { guard, authenticatePat } = createGuard();
      authenticatePat.execute.mockRejectedValue(new UnauthorizedError('x'));
      const request = createRequest({
        headers: { authorization: 'Bearer tfp_revogado' },
      });

      await expect(guard.canActivate(createContext(request))).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('nega rotas @SessionOnly com 403 sem consultar o token', async () => {
      const { guard, authenticatePat } = createGuard(false, true);
      const request = createRequest({
        headers: { authorization: 'Bearer tfp_segredo' },
      });

      await expect(guard.canActivate(createContext(request))).rejects.toThrow(
        ForbiddenException,
      );
      expect(authenticatePat.execute).not.toHaveBeenCalled();
    });

    it('permite rotas @SessionOnly com o JWT de sessão', async () => {
      const { guard, tokenService } = createGuard(false, true);
      tokenService.verify.mockReturnValue(payload);
      const request = createRequest({
        headers: { authorization: 'Bearer jwt' },
      });

      await expect(guard.canActivate(createContext(request))).resolves.toBe(
        true,
      );
    });

    it('limita escritas por token, mas não leituras', async () => {
      const { guard } = createGuard();
      const write = () =>
        guard.canActivate(
          createContext(
            createRequest({
              method: 'PATCH',
              headers: { authorization: 'Bearer tfp_segredo' },
            }),
          ),
        );

      for (let i = 0; i < 60; i += 1) {
        await write();
      }

      await expect(write()).rejects.toThrow(HttpException);
      await expect(
        guard.canActivate(
          createContext(
            createRequest({
              method: 'GET',
              headers: { authorization: 'Bearer tfp_segredo' },
            }),
          ),
        ),
      ).resolves.toBe(true);
    });
  });

  describe('escopos do token de integração (negado por padrão)', () => {
    const withToken = (method = 'GET') =>
      createRequest({
        method,
        headers: { authorization: 'Bearer tfp_segredo' },
      });

    it('nega rota sem @RequiredScope, mesmo com token válido', async () => {
      const { guard } = createGuard(false, false, { requiredScope: null });
      const reply = { header: vi.fn() };

      await expect(
        guard.canActivate(createContext(withToken(), reply)),
      ).rejects.toThrow(/não está disponível para tokens de integração/);
    });

    it('token somente leitura lê, mas não escreve (403 + insufficient_scope)', async () => {
      const readOnly = { patScopes: [SCOPE_APPLICATIONS_READ] };
      const reader = createGuard(false, false, {
        ...readOnly,
        requiredScope: SCOPE_APPLICATIONS_READ,
      });
      const writer = createGuard(false, false, {
        ...readOnly,
        requiredScope: SCOPE_APPLICATIONS_WRITE,
      });
      const reply = { header: vi.fn() };

      await expect(
        reader.guard.canActivate(createContext(withToken(), reply)),
      ).resolves.toBe(true);
      await expect(
        writer.guard.canActivate(createContext(withToken('POST'), reply)),
      ).rejects.toThrow(ForbiddenException);
      expect(reply.header).toHaveBeenCalledWith(
        'WWW-Authenticate',
        'Bearer error="insufficient_scope", scope="applications:write"',
      );
    });

    it('token com leitura e escrita escreve', async () => {
      const { guard } = createGuard(false, false, {
        requiredScope: SCOPE_APPLICATIONS_WRITE,
      });

      await expect(
        guard.canActivate(createContext(withToken('PATCH'))),
      ).resolves.toBe(true);
    });

    it('a recusa por escopo não consome o limite de escritas', async () => {
      const { guard } = createGuard(false, false, {
        requiredScope: SCOPE_APPLICATIONS_WRITE,
        patScopes: [SCOPE_APPLICATIONS_READ],
      });

      for (let i = 0; i < 70; i += 1) {
        await expect(
          guard.canActivate(createContext(withToken('PATCH'))),
        ).rejects.toThrow(ForbiddenException);
      }
    });

    it('a sessão (JWT) não depende de escopo', async () => {
      const { guard, tokenService } = createGuard(false, false, {
        requiredScope: null,
      });
      tokenService.verify.mockReturnValue(payload);

      await expect(
        guard.canActivate(
          createContext(
            createRequest({ headers: { authorization: 'Bearer jwt' } }),
          ),
        ),
      ).resolves.toBe(true);
    });
  });
});
