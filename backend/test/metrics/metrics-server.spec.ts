import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { MetricsServer } from '../../src/infrastructure/metrics/metrics-server';
import { PromAppMetrics } from '../../src/infrastructure/metrics/prom-app-metrics';

const config = (values: Record<string, string> = {}) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('MetricsServer', () => {
  const metrics = new PromAppMetrics();
  const server = new MetricsServer(metrics, config());

  it('serve o formato de texto do Prometheus em GET /metrics', async () => {
    const response = await server.handle(
      '/metrics',
      'GET',
      undefined,
      undefined,
    );

    expect(response.status).toBe(200);
    expect(response.type).toContain('text/plain');
    expect(response.body).toContain('# TYPE trampo_build_info gauge');
  });

  it.each([
    ['/', 'GET'],
    ['/api/metrics', 'GET'],
    ['/metrics/extra', 'GET'],
    ['/metrics', 'POST'],
    ['/health', 'GET'],
  ])('%s %s responde 404: só /metrics existe', async (path, method) => {
    const response = await server.handle(path, method, undefined, undefined);

    expect(response.status).toBe(404);
  });

  it('com token configurado, exige o Bearer certo', async () => {
    const protectedServer = new MetricsServer(
      metrics,
      config({ METRICS_BEARER_TOKEN: 'segredo-de-metricas' }),
    );

    expect(
      (
        await protectedServer.handle(
          '/metrics',
          'GET',
          undefined,
          'segredo-de-metricas',
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await protectedServer.handle(
          '/metrics',
          'GET',
          'Bearer errado',
          'segredo-de-metricas',
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await protectedServer.handle(
          '/metrics',
          'GET',
          'Bearer segredo-de-metricas',
          'segredo-de-metricas',
        )
      ).status,
    ).toBe(200);
  });

  it('não sobe quando METRICS_ENABLED=false', async () => {
    const disabled = new MetricsServer(
      metrics,
      config({ METRICS_ENABLED: 'false' }),
    );

    await disabled.onApplicationBootstrap();
    await expect(disabled.onApplicationShutdown()).resolves.toBeUndefined();
  });

  it('sobe numa porta real e responde por HTTP', async () => {
    const live = new MetricsServer(metrics, config({ METRICS_PORT: '0' }));

    await live.onApplicationBootstrap();

    const address = (
      live as unknown as { server: { address(): { port: number } } }
    ).server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/metrics`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('trampo_build_info');
    expect(
      (await fetch(`http://127.0.0.1:${address.port}/api/metrics`)).status,
    ).toBe(404);

    await live.onApplicationShutdown();
  });
});
