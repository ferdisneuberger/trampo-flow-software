import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerHttpMetrics } from '../../src/infrastructure/metrics/http-metrics.plugin';
import { PromAppMetrics } from '../../src/infrastructure/metrics/prom-app-metrics';

let app: FastifyInstance;
let metrics: PromAppMetrics;

async function series(name: string) {
  const all = await metrics.registry.getMetricsAsJSON();

  return all.find((metric) => metric.name === name)?.values ?? [];
}

beforeEach(async () => {
  metrics = new PromAppMetrics();
  app = Fastify();
  registerHttpMetrics(app, metrics);

  // Simula o guard: quem manda "Bearer pat" é autenticado como pat.
  app.addHook('preHandler', (request, _reply, done) => {
    const header = request.headers.authorization;

    if (header === 'Bearer pat') {
      (request as unknown as { user: unknown }).user = { authMethod: 'pat' };
    }

    done();
  });
  app.get('/applications/:id', async () => ({ ok: true }));
  app.post('/auth/login', async (_request, reply) => reply.code(401).send({}));
  app.get('/boom', async () => {
    throw new Error('falha');
  });

  await app.ready();
});

afterEach(() => app.close());

describe('middleware HTTP', () => {
  it('conta a rota pelo template, não pelo caminho real', async () => {
    await app.inject({
      url: '/applications/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    });
    await app.inject({ url: '/applications/abc' });

    expect(await series('trampo_http_requests_total')).toEqual([
      {
        value: 2,
        labels: {
          method: 'GET',
          route: '/applications/:id',
          status: '200',
          auth: 'anonymous',
        },
      },
    ]);
  });

  it('404 sem rota vira "unmatched", sem guardar o caminho', async () => {
    await app.inject({ url: '/wp-admin/setup.php' });

    const [row] = await series('trampo_http_requests_total');

    expect(row?.labels).toMatchObject({ route: 'unmatched', status: '404' });
    expect(
      JSON.stringify(await series('trampo_http_requests_total')),
    ).not.toContain('wp-admin');
  });

  it('registra respostas 401 e erros 500', async () => {
    await app.inject({ method: 'POST', url: '/auth/login', payload: {} });
    await app.inject({ url: '/boom' });

    const rows = await series('trampo_http_requests_total');

    expect(
      rows
        .map(
          (row) => `${String(row.labels.route)}:${String(row.labels.status)}`,
        )
        .sort(),
    ).toEqual(['/auth/login:401', '/boom:500']);
  });

  it('separa o tipo de autenticação (interface x agentes)', async () => {
    await app.inject({
      url: '/applications/1',
      headers: { authorization: 'Bearer pat' },
    });
    await app.inject({ url: '/applications/1' });

    const auths = (await series('trampo_http_requests_total'))
      .map((row) => row.labels.auth)
      .sort();

    expect(auths).toEqual(['anonymous', 'pat']);
  });

  it('mede a duração em segundos com a classe do status', async () => {
    await app.inject({ url: '/applications/1' });

    const rows = await series('trampo_http_request_duration_seconds');
    const count = rows.find(
      (row) =>
        (row as { metricName?: string }).metricName ===
        'trampo_http_request_duration_seconds_count',
    );

    expect(count?.value).toBe(1);
    expect(count?.labels).toMatchObject({
      route: '/applications/:id',
      status_class: '2xx',
    });
  });

  it('o contador de requisições em andamento volta a zero', async () => {
    await Promise.all(
      Array.from({ length: 20 }, () => app.inject({ url: '/applications/1' })),
    );

    const [inFlight] = await series('trampo_http_requests_in_flight');

    expect(inFlight?.value).toBe(0);
  });

  it('cardinalidade: 1.000 caminhos aleatórios não criam séries novas', async () => {
    for (let i = 0; i < 1000; i += 1) {
      await app.inject({ url: `/aleatorio/${i}/${Math.random()}` });
    }

    const rows = await series('trampo_http_requests_total');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.labels.route).toBe('unmatched');
  });

  it('um erro ao registrar métrica não afeta a resposta', async () => {
    metrics.httpRequests.inc = () => {
      throw new Error('registro quebrado');
    };

    const response = await app.inject({ url: '/applications/1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
