import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpHandler } from '../src/http.js';
import { McpMetrics } from '../src/metrics.js';
import { API_URL, createFakeApi, makeApplication, page } from './helpers.js';

const ALICE = 'tfp_alice_token';
let server: Server | undefined;
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = undefined;
});

async function series(metrics: McpMetrics, name: string) {
  const all = await metrics.registry.getMetricsAsJSON();

  return (
    all
      .find((metric) => metric.name === name)
      ?.values.map((row) => ({ ...row.labels, value: row.value })) ?? []
  );
}

async function start(
  routes: Parameters<typeof createFakeApi>[0] = {},
  oauth = false,
) {
  const metrics = new McpMetrics();
  const api = createFakeApi({
    'GET /auth/whoami': ({ headers }) =>
      headers.get('authorization') === `Bearer ${ALICE}` ||
      headers.get('authorization') === 'Bearer tfo_oauth_token'
        ? { body: { id: 'u1' } }
        : { status: 401, body: { message: 'Token inválido' } },
    'GET /applications': page([makeApplication({ company: 'Acme' })]),
    ...routes,
  });

  server = createServer(
    createHttpHandler({
      apiUrl: API_URL,
      timeoutMs: 5000,
      fetch: api.fetchMock,
      metrics,
      oauth: oauth
        ? { resource: 'https://t.example/mcp', issuer: 'https://t.example' }
        : undefined,
    }),
  );
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));

  return {
    metrics,
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
}

const rpc = (
  base: string,
  headers: Record<string, string>,
  method = 'tools/list',
) =>
  fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method }),
  });

describe('métricas do MCP sobre HTTP', () => {
  it('conta requisições por rota e status e os desafios 401 por motivo', async () => {
    const { metrics, base } = await start();

    await rpc(base, {});
    await rpc(base, { Authorization: 'Bearer eyJhbGciOi.x.y' });
    await rpc(base, { Authorization: 'Bearer tfp_revogado' });
    await fetch(`${base}/health`);
    await fetch(`${base}/wp-admin/setup.php`);
    await fetch(`${base}/mcp`);

    const routes = await series(metrics, 'trampo_mcp_http_requests_total');

    expect(routes).toEqual(
      expect.arrayContaining([
        { route: 'mcp', status: '401', value: 3 },
        { route: 'mcp', status: '405', value: 1 },
        { route: 'health', status: '200', value: 1 },
      ]),
    );
    // O caminho de um scanner nunca vira rótulo.
    expect(JSON.stringify(routes)).not.toContain('wp-admin');

    const reasons = await series(metrics, 'trampo_mcp_auth_challenges_total');

    expect(reasons).toEqual(
      expect.arrayContaining([
        { reason: 'missing', value: 1 },
        { reason: 'unsupported_token', value: 1 },
        { reason: 'invalid_token', value: 1 },
      ]),
    );
  });

  it('valida o token uma vez e o resto vem do cache; separa tfp de tfo', async () => {
    const { metrics, base } = await start({}, true);

    await rpc(base, { Authorization: `Bearer ${ALICE}` });
    await rpc(base, { Authorization: `Bearer ${ALICE}` });
    await rpc(base, { Authorization: 'Bearer tfo_oauth_token' });

    expect(await series(metrics, 'trampo_mcp_token_validation_total')).toEqual(
      expect.arrayContaining([
        { result: 'ok', value: 2 },
        { result: 'cache_hit', value: 1 },
      ]),
    );
    expect(await series(metrics, 'trampo_mcp_token_kind_total')).toEqual(
      expect.arrayContaining([
        { kind: 'tfp', value: 2 },
        { kind: 'tfo', value: 1 },
      ]),
    );
  });

  it('API fora do ar na validação conta como upstream_error', async () => {
    const { metrics, base } = await start({
      'GET /auth/whoami': { status: 503 },
    });

    await rpc(base, { Authorization: `Bearer ${ALICE}` });

    expect(await series(metrics, 'trampo_mcp_token_validation_total')).toEqual([
      { result: 'upstream_error', value: 1 },
    ]);
  });

  it('classifica o agente pelo User-Agent e o método JSON-RPC', async () => {
    const { metrics, base } = await start();

    await rpc(base, {
      Authorization: `Bearer ${ALICE}`,
      'User-Agent': 'claude-code/2.1.0',
    });
    await rpc(
      base,
      { Authorization: `Bearer ${ALICE}`, 'User-Agent': 'Cursor/1.2' },
      'initialize',
    );
    await rpc(base, {
      Authorization: `Bearer ${ALICE}`,
      'User-Agent': 'curl/8.0',
    });

    expect(await series(metrics, 'trampo_mcp_client_requests_total')).toEqual(
      expect.arrayContaining([
        { client: 'claude_code', value: 1 },
        { client: 'cursor', value: 1 },
        { client: 'other', value: 1 },
      ]),
    );
    expect(await series(metrics, 'trampo_mcp_rpc_requests_total')).toEqual(
      expect.arrayContaining([
        { method: 'tools/list', value: 2 },
        { method: 'initialize', value: 1 },
      ]),
    );
  });

  it('chamadas de ferramenta (ok e erro) e as idas à API, com rota em template', async () => {
    const { metrics, base } = await start({
      'GET /applications/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10': {
        status: 404,
        body: { message: 'nada' },
      },
    });
    const client = new Client({ name: 'teste', version: '0.0.0' });

    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${ALICE}` } },
      }),
    );
    clients.push(client);

    await client.callTool({ name: 'list_applications', arguments: {} });
    await client.callTool({
      name: 'get_application',
      arguments: { id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10' },
    });

    expect(await series(metrics, 'trampo_mcp_tool_calls_total')).toEqual(
      expect.arrayContaining([
        { tool: 'list_applications', result: 'ok', value: 1 },
        { tool: 'get_application', result: 'error', value: 1 },
      ]),
    );
    expect(await series(metrics, 'trampo_mcp_upstream_requests_total')).toEqual(
      expect.arrayContaining([
        { endpoint: '/applications', status: '200', value: 1 },
        { endpoint: '/applications/:id', status: '404', value: 1 },
      ]),
    );
    expect((await metrics.registry.metrics()).includes('6d0f3f7e-6f1f')).toBe(
      false,
    );
  });

  it('falha de rede na API vira network_error', async () => {
    const metrics = new McpMetrics();

    server = createServer(
      createHttpHandler({
        apiUrl: API_URL,
        timeoutMs: 50,
        metrics,
        fetch: () => Promise.reject(new Error('rede caiu')),
      }),
    );
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve),
    );

    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    await rpc(base, { Authorization: `Bearer ${ALICE}` });

    expect(await series(metrics, 'trampo_mcp_upstream_requests_total')).toEqual(
      [{ endpoint: '/auth/whoami', status: 'network_error', value: 1 }],
    );
  });
});
