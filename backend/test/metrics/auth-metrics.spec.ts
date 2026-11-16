import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../src/application/shared/errors/conflict.error';
import { ForbiddenError } from '../../src/application/shared/errors/forbidden.error';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { AuthController } from '../../src/infrastructure/http/controllers/auth.controller';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';

const REFRESH_EXPIRES_AT = new Date('2026-12-01T00:00:00.000Z');

function makeUser(): User {
  return User.restore({
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    email: 'fernando@example.com',
    firstName: 'Fernando',
    lastName: 'Neuberger',
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    verificationSentAt: null,
    termsAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    termsVersion: '2026-11',
    username: null,
    googleId: null,
    passwordHash: 'scrypt$16384$8$1$c2FsdA==$a2V5',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

const request = (cookies: Record<string, string> = {}) =>
  ({
    ip: '203.0.113.9',
    headers: { 'user-agent': 'vitest' },
    cookies,
  }) as unknown as FastifyRequest;

const reply = () =>
  ({ setCookie: vi.fn(), clearCookie: vi.fn() }) as unknown as FastifyReply;

function setup() {
  const metrics = new SpyAppMetrics();
  const fns = {
    authenticate: vi.fn(),
    createSession: vi.fn().mockResolvedValue({
      refreshToken: 'r',
      refreshTokenExpiresAt: REFRESH_EXPIRES_AT,
    }),
    refreshSession: vi.fn(),
    logoutSession: vi.fn().mockResolvedValue(undefined),
    registerUser: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn(),
    googleSignIn: vi.fn(),
    assertAllowed: vi.fn(),
    registerSuccess: vi.fn(),
    registerFailure: vi.fn(),
  };
  const use = (fn: unknown) => ({ execute: fn }) as never;

  const controller = new AuthController(
    use(fns.authenticate),
    use(fns.createSession),
    use(fns.refreshSession),
    use(fns.logoutSession),
    use(vi.fn()),
    use(fns.registerUser),
    use(fns.verifyEmail),
    use(fns.resendVerification),
    use(fns.forgotPassword),
    use(fns.resetPassword),
    use(vi.fn()),
    use(fns.googleSignIn),
    { consume: vi.fn() } as never,
    {
      sign: vi.fn().mockReturnValue({ token: 'jwt', expiresAt: 1 }),
      expiresInSeconds: 60,
    } as never,
    {
      assertAllowed: fns.assertAllowed,
      registerSuccess: fns.registerSuccess,
      registerFailure: fns.registerFailure,
    } as never,
    {
      get: (key: string) => ({ NODE_ENV: 'test', CORS_ORIGINS: '' })[key],
    } as unknown as ConfigService,
    metrics,
  );

  return { controller, metrics, ...fns };
}

describe('métricas de autenticação (AuthController)', () => {
  it('login com sucesso e com senha errada', async () => {
    const { controller, metrics, authenticate } = setup();

    authenticate.mockResolvedValueOnce(makeUser());
    await controller.login(
      { email: 'a@b.com', password: 'x' },
      request(),
      reply(),
    );

    authenticate.mockRejectedValueOnce(new UnauthorizedError());
    await expect(
      controller.login({ email: 'a@b.com', password: 'x' }, request(), reply()),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(metrics.of('loginAttempted')).toEqual([
      ['password', 'success'],
      ['password', 'invalid_credentials'],
    ]);
  });

  it('login bloqueado pelo limitador e erro inesperado', async () => {
    const { controller, metrics, assertAllowed, authenticate } = setup();

    assertAllowed.mockImplementationOnce(() => {
      throw new HttpException('muitas', 429);
    });
    await expect(
      controller.login({ email: 'a@b.com', password: 'x' }, request(), reply()),
    ).rejects.toBeInstanceOf(HttpException);

    authenticate.mockRejectedValueOnce(new Error('banco caiu'));
    await expect(
      controller.login({ email: 'a@b.com', password: 'x' }, request(), reply()),
    ).rejects.toThrow('banco caiu');

    expect(metrics.of('loginAttempted')).toEqual([
      ['password', 'blocked'],
      ['password', 'error'],
    ]);
  });

  it('login com Google: novo, existente e falha', async () => {
    const { controller, metrics, googleSignIn } = setup();
    const dto = { credential: 'c', termsAccepted: true };

    googleSignIn.mockResolvedValueOnce({ user: makeUser(), isNew: true });
    await controller.google(dto, request(), reply());
    googleSignIn.mockResolvedValueOnce({ user: makeUser(), isNew: false });
    await controller.google(dto, request(), reply());
    googleSignIn.mockRejectedValueOnce(new UnauthorizedError());
    await expect(
      controller.google(dto, request(), reply()),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(metrics.of('googleSignIn')).toEqual([
      ['created'],
      ['existing'],
      ['failed'],
    ]);
    expect(metrics.of('registrationAttempted')).toEqual([
      ['google', 'created'],
    ]);
    expect(metrics.of('loginAttempted')).toEqual([
      ['google', 'success'],
      ['google', 'success'],
      ['google', 'invalid_credentials'],
    ]);
  });

  it('cadastro: criado, desligado, e-mail em uso e inválido', async () => {
    const { controller, metrics, registerUser } = setup();
    const dto = {
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      password: 'x',
      termsAccepted: true,
    };

    registerUser.mockResolvedValueOnce(undefined);
    await controller.register(dto, request());
    registerUser.mockRejectedValueOnce(new ForbiddenError('desligado'));
    await expect(controller.register(dto, request())).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    registerUser.mockRejectedValueOnce(new ConflictError('em uso'));
    await expect(controller.register(dto, request())).rejects.toBeInstanceOf(
      ConflictError,
    );
    registerUser.mockRejectedValueOnce(new DomainError('ruim', 'X'));
    await expect(controller.register(dto, request())).rejects.toBeInstanceOf(
      DomainError,
    );

    expect(metrics.of('registrationAttempted')).toEqual([
      ['password', 'created'],
      ['password', 'disabled'],
      ['password', 'email_taken'],
      ['password', 'invalid'],
    ]);
  });

  it('verificação de e-mail: confirmada, inválida e reenvio', async () => {
    const { controller, metrics, verifyEmail, resendVerification } = setup();

    verifyEmail.mockResolvedValueOnce(undefined);
    await controller.confirmVerification({ token: 't' }, request());
    verifyEmail.mockRejectedValueOnce(
      new DomainError('x', 'INVALID_VERIFICATION_TOKEN'),
    );
    await expect(
      controller.confirmVerification({ token: 't' }, request()),
    ).rejects.toBeInstanceOf(DomainError);

    resendVerification.mockResolvedValueOnce({
      sent: true,
      retryAfterSeconds: 120,
    });
    await controller.resendVerificationEmail('u', request());
    resendVerification.mockResolvedValueOnce({
      sent: false,
      retryAfterSeconds: 60,
    });
    await controller.resendVerificationEmail('u', request());
    resendVerification.mockResolvedValueOnce({
      sent: false,
      retryAfterSeconds: 0,
    });
    await controller.resendVerificationEmail('u', request());

    expect(metrics.of('emailVerification')).toEqual([
      ['confirmed'],
      ['invalid'],
      ['resent'],
      ['rate_limited'],
    ]);
  });

  it('recuperação de senha: pedida, concluída e inválida', async () => {
    const { controller, metrics, resetPassword } = setup();

    await controller.forgotPasswordRequest({ email: 'a@b.com' }, request());
    resetPassword.mockResolvedValueOnce(undefined);
    await controller.resetPasswordRequest(
      { token: 't', password: 'p' },
      request(),
    );
    resetPassword.mockRejectedValueOnce(
      new DomainError('x', 'INVALID_RESET_TOKEN'),
    );
    await expect(
      controller.resetPasswordRequest({ token: 't', password: 'p' }, request()),
    ).rejects.toBeInstanceOf(DomainError);

    expect(metrics.of('passwordReset')).toEqual([
      ['requested'],
      ['completed'],
      ['invalid'],
    ]);
  });

  it('renovação de sessão: ok, ausente e REUTILIZADA (sinal de roubo)', async () => {
    const { controller, metrics, refreshSession } = setup();
    const cookie = { refresh_token: 'r' };

    refreshSession.mockResolvedValueOnce({
      userId: 'u',
      refreshToken: 'r2',
      refreshTokenExpiresAt: REFRESH_EXPIRES_AT,
    });
    await controller.refresh(request(cookie), reply());

    await expect(controller.refresh(request(), reply())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    for (const code of [
      'REFRESH_TOKEN_REUSED',
      'EXPIRED_REFRESH_TOKEN',
      'INVALID_REFRESH_TOKEN',
    ]) {
      refreshSession.mockRejectedValueOnce(new UnauthorizedError('x', code));
      await expect(
        controller.refresh(request(cookie), reply()),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    }

    expect(metrics.of('sessionRefreshed')).toEqual([
      ['ok'],
      ['missing'],
      ['reused'],
      ['expired'],
      ['invalid'],
    ]);
  });

  it('encerramento de sessão', async () => {
    const { controller, metrics } = setup();

    await controller.logout(request({ refresh_token: 'r' }), reply());

    expect(metrics.of('loggedOut')).toEqual([[]]);
  });
});
