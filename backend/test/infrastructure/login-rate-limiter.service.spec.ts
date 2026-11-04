import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginRateLimiter } from '../../src/infrastructure/auth/login-rate-limiter.service';

function createConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function createLimiter(
  overrides: Record<string, string | undefined> = {},
): LoginRateLimiter {
  return new LoginRateLimiter(
    createConfig({
      LOGIN_MAX_ATTEMPTS: '2',
      LOGIN_WINDOW_SECONDS: '60',
      ...overrides,
    }),
  );
}

describe('LoginRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bloqueia após o limite global de falhas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createLimiter();

    limiter.assertAllowed();
    limiter.registerFailure();
    limiter.assertAllowed();
    limiter.registerFailure();

    expect(() => limiter.assertAllowed()).toThrow(HttpException);
  });

  it('retorna 429 com o código TOO_MANY_ATTEMPTS', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createLimiter();

    limiter.registerFailure();
    limiter.registerFailure();

    try {
      limiter.assertAllowed();
      throw new Error('Era esperado o bloqueio do login.');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);

      const exception = error as HttpException;

      expect(exception.getStatus()).toBe(429);
      expect(exception.getResponse()).toMatchObject({
        error: 'TOO_MANY_ATTEMPTS',
      });
    }
  });

  it('libera o login após a janela de bloqueio', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createLimiter();

    limiter.registerFailure();
    limiter.registerFailure();

    expect(() => limiter.assertAllowed()).toThrow(HttpException);

    vi.advanceTimersByTime(60_001);

    expect(() => limiter.assertAllowed()).not.toThrow();
  });

  it('zera o contador após um login bem-sucedido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createLimiter();

    limiter.registerFailure();
    limiter.registerSuccess();
    limiter.registerFailure();

    expect(() => limiter.assertAllowed()).not.toThrow();

    limiter.registerFailure();

    expect(() => limiter.assertAllowed()).toThrow(HttpException);
  });

  it('usa os padrões quando a configuração é inválida', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const limiter = createLimiter({
      LOGIN_MAX_ATTEMPTS: '0',
      LOGIN_WINDOW_SECONDS: 'invalido',
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      limiter.registerFailure();
    }

    expect(() => limiter.assertAllowed()).toThrow(HttpException);

    vi.advanceTimersByTime(120_001);

    expect(() => limiter.assertAllowed()).not.toThrow();
  });
});
