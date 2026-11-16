#!/usr/bin/env node
import { createServer as createHttpServer } from 'node:http';
import { z } from 'zod';
import { createHttpHandler } from './http.js';
import { McpMetrics, startMetricsServer } from './metrics.js';
import { SERVER_VERSION } from './server.js';

const envSchema = z.object({
  TRAMPO_API_URL: z
    .string({ error: 'TRAMPO_API_URL é obrigatória.' })
    .trim()
    .url('TRAMPO_API_URL deve ser uma URL.'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  OAUTH_ENABLED: z.enum(['true', 'false']).default('false'),
  METRICS_ENABLED: z.enum(['true', 'false']).default('true'),
  METRICS_PORT: z.coerce.number().int().min(1).max(65535).default(9465),
  METRICS_BEARER_TOKEN: z.string().trim().optional(),
  OAUTH_ISSUER: z.string().trim().optional(),
  MCP_PUBLIC_URL: z.string().trim().optional(),
  TRAMPO_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(120_000)
    .default(15_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    `Configuração inválida do trampo-flow-mcp (HTTP):\n${parsed.error.issues.map((i) => `- ${i.message}`).join('\n')}`,
  );
  process.exit(1);
}

const { TRAMPO_API_URL, PORT, TRAMPO_API_TIMEOUT_MS } = parsed.data;

function secureOrLocal(value: string | undefined): value is string {
  try {
    const url = new URL(value ?? '');

    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

if (
  parsed.data.OAUTH_ENABLED === 'true' &&
  !(
    secureOrLocal(parsed.data.OAUTH_ISSUER) &&
    secureOrLocal(parsed.data.MCP_PUBLIC_URL)
  )
) {
  console.error(
    'Com OAUTH_ENABLED=true, OAUTH_ISSUER e MCP_PUBLIC_URL são obrigatórias e devem ser https (ou http em localhost).',
  );
  process.exit(1);
}

const oauth =
  parsed.data.OAUTH_ENABLED === 'true'
    ? {
        issuer: parsed.data.OAUTH_ISSUER as string,
        resource: parsed.data.MCP_PUBLIC_URL as string,
      }
    : undefined;
const metrics = new McpMetrics();
const server = createHttpServer(
  createHttpHandler({
    metrics,
    apiUrl: TRAMPO_API_URL.replace(/\/+$/, ''),
    timeoutMs: TRAMPO_API_TIMEOUT_MS,
    oauth,
  }),
);

server.listen(PORT, '0.0.0.0', () => {
  console.error(
    `[trampo-flow-mcp] v${SERVER_VERSION} HTTP em :${PORT}/mcp (API: ${TRAMPO_API_URL})`,
  );
});

// Métricas do Prometheus em porta interna própria (não publicada, fora do /mcp).
const metricsServer =
  parsed.data.METRICS_ENABLED === 'true'
    ? startMetricsServer(metrics, {
        port: parsed.data.METRICS_PORT,
        token: parsed.data.METRICS_BEARER_TOKEN || undefined,
      })
    : undefined;

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    metricsServer?.close();
    server.close(() => process.exit(0));
  });
}
