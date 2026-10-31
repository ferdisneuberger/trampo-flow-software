import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/infrastructure/auth/auth.service';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../src/infrastructure/auth/jwt-auth.guard';
import {
  TokenService,
  type JwtPayload,
} from '../../src/infrastructure/auth/token.service';

const payload = {
  sub: 'fernando',
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
  const authService = {
    isCurrentUser: vi.fn(),
  };
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    tokenService as unknown as TokenService,
    authService as unknown as AuthService,
  );

  return { guard, tokenService, authService };
}

describe('JwtAuthGuard', () => {
  it('libera rotas públicas sem token', () => {
    const { guard, tokenService } = createGuard(true);
    const request = createRequest();

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('libera preflight OPTIONS sem token', () => {
    const { guard } = createGuard();
    const request = createRequest({ method: 'OPTIONS' });

    expect(guard.canActivate(createContext(request))).toBe(true);
  });

  it('rejeita requisição sem Authorization', () => {
    const { guard } = createGuard();

    expect(() => guard.canActivate(createContext(createRequest()))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita esquema diferente de Bearer', () => {
    const { guard } = createGuard();
    const request = createRequest({
      headers: { authorization: 'Basic token' },
    });

    expect(() => guard.canActivate(createContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('valida o token e identifica o usuário atual', () => {
    const { guard, tokenService, authService } = createGuard();
    const request = createRequest({
      headers: { authorization: 'Bearer token-valido' },
    });

    tokenService.verify.mockReturnValue(payload);
    authService.isCurrentUser.mockReturnValue(true);

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('token-valido');
    expect(authService.isCurrentUser).toHaveBeenCalledWith('fernando');
    expect(request.user).toEqual(payload);
  });

  it('rejeita token de outro usuário', () => {
    const { guard, tokenService, authService } = createGuard();
    const request = createRequest({
      headers: { authorization: 'Bearer token-valido' },
    });

    tokenService.verify.mockReturnValue(payload);
    authService.isCurrentUser.mockReturnValue(false);

    expect(() => guard.canActivate(createContext(request))).toThrow(
      UnauthorizedException,
    );
  });
});
