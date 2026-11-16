import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PromAppMetrics } from './prom-app-metrics';

type TimedRequest = { startedAt: bigint; counted: boolean };

const timing = new WeakMap<FastifyRequest, TimedRequest>();

/**
 * Rota como **template** (`/applications/:id`), nunca o caminho real: é o que
 * mantém a cardinalidade fixa. Requisição sem rota casada vira `unmatched`.
 */
export function routeLabel(request: FastifyRequest): string {
  if (request.is404) {
    return 'unmatched';
  }

  return request.routeOptions?.url || 'unmatched';
}

function authLabel(request: FastifyRequest): string {
  const method = (
    request as FastifyRequest & { user?: { authMethod?: string } }
  ).user?.authMethod;

  return method === 'jwt' || method === 'pat' || method === 'oauth'
    ? method
    : 'anonymous';
}

function finish(request: FastifyRequest, metrics: PromAppMetrics): void {
  const entry = timing.get(request);

  if (!entry || entry.counted) {
    return;
  }

  entry.counted = true;
  metrics.httpInFlight.dec();
}

/**
 * Middleware HTTP: conta e mede **todas** as requisições (inclusive 404 sem
 * rota, rejeições do guard e erros de validação) pelos hooks do Fastify. Nunca
 * lança: um erro aqui não pode afetar a resposta.
 */
export function registerHttpMetrics(
  fastify: FastifyInstance,
  metrics: PromAppMetrics,
): void {
  fastify.addHook('onRequest', (request, _reply, done) => {
    try {
      timing.set(request, {
        startedAt: process.hrtime.bigint(),
        counted: false,
      });
      metrics.httpInFlight.inc();
    } catch {
      // instrumentação não pode afetar a requisição
    }

    done();
  });

  fastify.addHook('onRequestAbort', (request, done) => {
    try {
      finish(request, metrics);
    } catch {
      // idem
    }

    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    try {
      const entry = timing.get(request);
      const route = routeLabel(request);
      const status = reply.statusCode;
      const seconds = entry
        ? Number(process.hrtime.bigint() - entry.startedAt) / 1e9
        : 0;

      metrics.httpRequests.inc({
        method: request.method,
        route,
        status: String(status),
        auth: authLabel(request),
      });
      metrics.httpDuration.observe(
        {
          method: request.method,
          route,
          status_class: `${Math.floor(status / 100)}xx`,
        },
        seconds,
      );

      const size = Number(request.headers['content-length']);

      if (Number.isFinite(size) && size >= 0) {
        metrics.httpRequestSize.observe({ route }, size);
      }

      finish(request, metrics);
    } catch {
      // idem
    }

    done();
  });
}
