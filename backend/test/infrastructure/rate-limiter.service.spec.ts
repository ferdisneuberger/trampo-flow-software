import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';

describe('RateLimiterService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite até o limite na janela', () => {
    const limiter = new RateLimiterService();

    expect(() => limiter.consume('key', 2, 60_000)).not.toThrow();
    expect(() => limiter.consume('key', 2, 60_000)).not.toThrow();
  });

  it('bloqueia acima do limite e informa o retry', () => {
    const limiter = new RateLimiterService();

    limiter.consume('key', 1, 60_000);

    try {
      limiter.consume('key', 1, 60_000);
      throw new Error('Esperava bloqueio.');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'RATE_LIMITED',
        retryAfterSeconds: 60,
      });
    }
  });

  it('libera novamente após a janela', () => {
    const limiter = new RateLimiterService();

    limiter.consume('key', 1, 60_000);
    vi.advanceTimersByTime(60_001);

    expect(() => limiter.consume('key', 1, 60_000)).not.toThrow();
  });

  it('mantém chaves independentes', () => {
    const limiter = new RateLimiterService();

    limiter.consume('a', 1, 60_000);

    expect(() => limiter.consume('b', 1, 60_000)).not.toThrow();
  });
});
