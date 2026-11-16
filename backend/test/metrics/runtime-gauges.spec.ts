import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromAppMetrics } from '../../src/infrastructure/metrics/prom-app-metrics';
import { RuntimeGaugesService } from '../../src/infrastructure/metrics/runtime-gauges.service';

function fakePrisma(options: { fail?: boolean } = {}) {
  const callbacks: {
    query?: (sql: string, ms: number) => void;
    error?: () => void;
  } = {};

  return {
    callbacks,
    prisma: {
      onQuery: (callback: (sql: string, ms: number) => void) => {
        callbacks.query = callback;
      },
      onError: (callback: () => void) => {
        callbacks.error = callback;
      },
      $queryRaw: vi.fn(() =>
        options.fail
          ? Promise.reject(new Error('banco fora'))
          : Promise.resolve([1]),
      ),
    },
  };
}

async function value(metrics: PromAppMetrics, name: string) {
  const all = await metrics.registry.getMetricsAsJSON();

  return all.find((metric) => metric.name === name)?.values[0]?.value;
}

describe('RuntimeGaugesService', () => {
  let service: RuntimeGaugesService | undefined;

  afterEach(() => service?.onModuleDestroy());

  it('trampo_db_up vira 1 quando o banco responde', async () => {
    const metrics = new PromAppMetrics();
    const { prisma } = fakePrisma();

    service = new RuntimeGaugesService(metrics, prisma as never);
    await service.probe();

    expect(await value(metrics, 'trampo_db_up')).toBe(1);
  });

  it('trampo_db_up vira 0 quando o banco falha, sem lançar', async () => {
    const metrics = new PromAppMetrics();
    const { prisma } = fakePrisma({ fail: true });

    service = new RuntimeGaugesService(metrics, prisma as never);
    await expect(service.probe()).resolves.toBeUndefined();

    expect(await value(metrics, 'trampo_db_up')).toBe(0);
  });

  it('liga os eventos do Prisma: duração por tabela e contagem de erros', async () => {
    const metrics = new PromAppMetrics();
    const { prisma, callbacks } = fakePrisma();

    service = new RuntimeGaugesService(metrics, prisma as never);
    service.onModuleInit();
    callbacks.query?.('SELECT "x" FROM "public"."applications"', 12);
    callbacks.error?.();

    const text = await metrics.registry.metrics();

    expect(text).toContain(
      'trampo_db_query_duration_seconds_count{operation="select",table="applications"} 1',
    );
    expect(await value(metrics, 'trampo_db_query_errors_total')).toBe(1);
    expect(text).not.toContain('"x"');
  });
});
