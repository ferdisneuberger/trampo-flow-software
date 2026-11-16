import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import {
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
} from '../../src/domain/auth/scopes';
import { JwtAuthGuard } from '../../src/infrastructure/auth/jwt-auth.guard';
import { IS_SESSION_ONLY_KEY } from '../../src/infrastructure/auth/session-only.decorator';
import { REQUIRED_SCOPE_KEY } from '../../src/infrastructure/auth/required-scope.decorator';
import { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';

type Options = {
  sessionOnly?: boolean;
  requiredScope?: string | null;
  patScopes?: string[];
  patFails?: boolean;
  jwtError?: Error;
  userExists?: boolean;
  oauthFails?: boolean;
};

function setup(options: Options = {}) {
  const metrics = new SpyAppMetrics();
  const requiredScope =
    options.requiredScope === undefined
      ? SCOPE_APPLICATIONS_READ
      : (options.requiredScope ?? undefined);
  const reflector = {
    getAllAndOverride: vi.fn((key: string) =>
      key === IS_SESSION_ONLY_KEY
        ? (options.sessionOnly ?? false)
        : key === REQUIRED_SCOPE_KEY
          ? requiredScope
          : undefined,
    ),
  };
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    {
      verify: vi.fn(() => {
        if (options.jwtError) throw options.jwtError;
        return { sub: 'u1' };
      }),
    } as never,
    {
      existsById: vi.fn().mockResolvedValue(options.userExists ?? true),
    } as never,
    {
      execute: vi.fn(() =>
        options.patFails
          ? Promise.reject(
              new UnauthorizedError('x', 'INVALID_PERSONAL_ACCESS_TOKEN'),
            )
          : Promise.resolve({
              userId: 'u1',
              tokenId: 't1',
              scopes: options.patScopes ?? [
                SCOPE_APPLICATIONS_READ,
                SCOPE_APPLICATIONS_WRITE,
              ],
            }),
      ),
    } as never,
    new RateLimiterService(),
    {
      execute: vi.fn(() =>
        options.oauthFails
          ? Promise.reject(
              new UnauthorizedError('x', 'INVALID_OAUTH_ACCESS_TOKEN'),
            )
          : Promise.resolve({
              userId: 'u1',
              tokenId: 't',
              grantId: 'g',
              scopes: [SCOPE_APPLICATIONS_READ],
            }),
      ),
    } as never,
    {
      enabled: true,
      protectedResourceMetadataUrl:
        'https://x/.well-known/oauth-protected-resource/mcp',
    } as never,
    metrics,
  );

  return { guard, metrics };
}

const context = (authorization?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        headers: authorization ? { authorization } : {},
      }),
      getResponse: () => ({ header: vi.fn() }),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe('métricas do guard', () => {
  it('sem token e cabeçalho inválido', async () => {
    const { guard, metrics } = setup();

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      guard.canActivate(context('Basic abc')),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(metrics.of('guardDenied')).toEqual([
      ['missing_token', 'anonymous'],
      ['invalid_token', 'anonymous'],
    ]);
  });

  it('JWT: inválido, expirado e usuário apagado', async () => {
    const invalid = setup({
      jwtError: new UnauthorizedException({ code: 'INVALID_TOKEN' }),
    });
    const expired = setup({
      jwtError: new UnauthorizedException({ code: 'TOKEN_EXPIRED' }),
    });
    const gone = setup({ userExists: false });

    await expect(
      invalid.guard.canActivate(context('Bearer a.b.c')),
    ).rejects.toBeDefined();
    await expect(
      expired.guard.canActivate(context('Bearer a.b.c')),
    ).rejects.toBeDefined();
    await expect(
      gone.guard.canActivate(context('Bearer a.b.c')),
    ).rejects.toBeDefined();

    expect(invalid.metrics.of('guardDenied')).toEqual([
      ['invalid_token', 'jwt'],
    ]);
    expect(expired.metrics.of('guardDenied')).toEqual([
      ['expired_token', 'jwt'],
    ]);
    expect(gone.metrics.of('guardDenied')).toEqual([['invalid_token', 'jwt']]);
  });

  it('token de integração: autenticado (leitura x escrita) e rejeitado', async () => {
    const readWrite = setup();
    const readOnly = setup({ patScopes: [SCOPE_APPLICATIONS_READ] });
    const bad = setup({ patFails: true });

    await readWrite.guard.canActivate(context('Bearer tfp_x'));
    await readOnly.guard.canActivate(context('Bearer tfp_x'));
    await expect(
      bad.guard.canActivate(context('Bearer tfp_x')),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(readWrite.metrics.of('personalToken')).toEqual([
      ['authenticated', 'read_write'],
    ]);
    expect(readOnly.metrics.of('personalToken')).toEqual([
      ['authenticated', 'read'],
    ]);
    expect(bad.metrics.of('personalToken')).toEqual([['rejected', 'unknown']]);
    expect(bad.metrics.of('guardDenied')).toEqual([['invalid_token', 'pat']]);
  });

  it('rota só de sessão, rota fechada e escopo insuficiente, por tipo de token', async () => {
    const session = setup({ sessionOnly: true });
    const closed = setup({ requiredScope: null });
    const scope = setup({
      requiredScope: SCOPE_APPLICATIONS_WRITE,
      patScopes: [SCOPE_APPLICATIONS_READ],
    });

    await expect(
      session.guard.canActivate(context('Bearer tfp_x')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      session.guard.canActivate(context('Bearer tfo_x')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      closed.guard.canActivate(context('Bearer tfp_x')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      scope.guard.canActivate(context('Bearer tfp_x')),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(session.metrics.of('guardDenied')).toEqual([
      ['session_only', 'pat'],
      ['session_only', 'oauth'],
    ]);
    expect(closed.metrics.of('guardDenied')).toEqual([['route_closed', 'pat']]);
    expect(scope.metrics.of('guardDenied')).toEqual([
      ['insufficient_scope', 'pat'],
    ]);
  });

  it('access token OAuth inválido', async () => {
    const { guard, metrics } = setup({ oauthFails: true });

    await expect(
      guard.canActivate(context('Bearer tfo_x')),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(metrics.of('guardDenied')).toEqual([['invalid_token', 'oauth']]);
  });

  it('um acesso permitido não registra negação', async () => {
    const { guard, metrics } = setup();

    await guard.canActivate(context('Bearer a.b.c'));

    expect(metrics.of('guardDenied')).toEqual([]);
  });
});
