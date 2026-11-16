import { Module } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { LoginRateLimiter } from '../../src/infrastructure/auth/login-rate-limiter.service';
import { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';

describe('métricas dos limitadores', () => {
  it('conta cada requisição barrada, com a chave inteira só no limitador', () => {
    const metrics = new SpyAppMetrics();
    const limiter = new RateLimiterService(metrics);

    limiter.consume('register:ip:1.2.3.4', 2, 60_000);
    limiter.consume('register:ip:1.2.3.4', 2, 60_000);

    expect(metrics.of('rateLimited')).toEqual([]);
    expect(() => limiter.consume('register:ip:1.2.3.4', 2, 60_000)).toThrow();
    expect(() => limiter.consume('register:ip:1.2.3.4', 2, 60_000)).toThrow();

    expect(metrics.of('rateLimited')).toEqual([
      ['register:ip:1.2.3.4'],
      ['register:ip:1.2.3.4'],
    ]);
  });

  it('o limitador de login conta o travamento uma vez, quando passa do limite', () => {
    const metrics = new SpyAppMetrics();
    const limiter = new LoginRateLimiter(
      {
        get: (key: string) => ({ LOGIN_MAX_ATTEMPTS: '3' })[key],
      } as unknown as ConfigService,
      metrics,
    );

    limiter.registerFailure();
    limiter.registerFailure();
    expect(metrics.of('loginLockedOut')).toEqual([]);

    limiter.registerFailure();
    expect(metrics.of('loginLockedOut')).toEqual([[]]);
    expect(() => limiter.assertAllowed()).toThrow();
  });
});

describe('injeção sem o MetricsModule', () => {
  it('os componentes instrumentados sobem num módulo que não fornece AppMetrics', async () => {
    // O Nest ignora o valor padrão de um parâmetro: sem @Optional() a
    // inicialização abortava em qualquer módulo sem o MetricsModule global.
    class TestModule {}

    Module({ providers: [RateLimiterService] })(TestModule);

    const context = await NestFactory.createApplicationContext(TestModule, {
      logger: false,
    });

    expect(context.get(RateLimiterService)).toBeInstanceOf(RateLimiterService);
    expect(() =>
      context.get(RateLimiterService).consume('x:y', 1, 1000),
    ).not.toThrow();

    await context.close();
  });
});
