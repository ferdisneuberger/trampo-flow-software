#!/usr/bin/env node
import { createServer as createHttpServer } from 'node:http';
import { z } from 'zod';
import { createHttpHandler } from './http.js';
import { SERVER_VERSION } from './server.js';

const envSchema = z.object({
  TRAMPO_API_URL: z
    .string({ error: 'TRAMPO_API_URL é obrigatória.' })
    .trim()
    .url('TRAMPO_API_URL deve ser uma URL.'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
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
const server = createHttpServer(
  createHttpHandler({
    apiUrl: TRAMPO_API_URL.replace(/\/+$/, ''),
    timeoutMs: TRAMPO_API_TIMEOUT_MS,
  }),
);

server.listen(PORT, '0.0.0.0', () => {
  console.error(
    `[trampo-flow-mcp] v${SERVER_VERSION} HTTP em :${PORT}/mcp (API: ${TRAMPO_API_URL})`,
  );
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
