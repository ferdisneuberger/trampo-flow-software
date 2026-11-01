import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../src/domain/users/repositories/user.repository';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../src/infrastructure/auth/jwt-auth.guard';
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

function createContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function createGuard(isPublic = false) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(isPublic),
  };
  const tokenService = {
    verify: vi.fn(),
  };
  const userRepository = {
    existsById: vi.fn().mockResolvedValue(true),
  };
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    tokenService as unknown as TokenService,
    userRepository as unknown as UserRepository,
  );

  return { guard, tokenService, userRepository };
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
    expect(request.user).toEqual(payload);
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
});
