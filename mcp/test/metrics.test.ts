import { describe, expect, it } from 'vitest';
import {
  classifyClient,
  clientInfoName,
  createMetricsHandler,
  endpointLabel,
  McpMetrics,
  routeLabel,
  rpcMethodLabel,
} from '../src/metrics.js';

async function series(metrics: McpMetrics, name: string) {
  const all = await metrics.registry.getMetricsAsJSON();

  return all.find((metric) => metric.name === name)?.values ?? [];
}

describe('classifyClient', () => {
  it.each([
    [['claude-code/2.1.0'], 'claude_code'],
    [['Claude Code'], 'claude_code'],
    [['claude-ai', undefined], 'claude'],
    [['Claude-User'], 'claude'],
    [['Cursor/1.2'], 'cursor'],
    [['Visual Studio Code'], 'vscode'],
    [['vscode-copilot'], 'vscode'],
    [['opencode/0.4'], 'opencode'],
    [['node', 'python-httpx'], 'other'],
    [[undefined, undefined], 'other'],
  ])('%j -> %s', (hints, expected) => {
    expect(classifyClient(...hints)).toBe(expected);
  });
});

describe('rótulos fechados', () => {
  it('endpointLabel: UUID vira :id, a query some, o resto vira other', () => {
    expect(endpointLabel('/applications')).toBe('/applications');
    expect(endpointLabel('/applications?search=acme&limit=5')).toBe(
      '/applications',
    );
    expect(
      endpointLabel('/applications/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10'),
    ).toBe('/applications/:id');
    expect(
      endpointLabel(
        '/applications/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10/placement',
      ),
    ).toBe('/applications/:id/placement');
    expect(endpointLabel('/admin/users/a@b.com')).toBe('other');
  });

  it('rpcMethodLabel e clientInfoName: método numa lista fechada, inclusive em lote', () => {
    expect(rpcMethodLabel({ method: 'tools/call' })).toBe('tools/call');
    expect(rpcMethodLabel([{ method: 'initialize' }, { method: 'x' }])).toBe(
      'initialize',
    );
    expect(rpcMethodLabel({ method: 'metodo/inventado' })).toBe('other');
    expect(rpcMethodLabel(null)).toBe('other');
    expect(rpcMethodLabel('x')).toBe('other');
    expect(clientInfoName({ params: { clientInfo: { name: 'Cursor' } } })).toBe(
      'Cursor',
    );
    expect(clientInfoName({ params: {} })).toBeUndefined();
  });

  it('routeLabel', () => {
    expect(routeLabel('/mcp')).toBe('mcp');
    expect(routeLabel('/mcp?x=1')).toBe('mcp');
    expect(routeLabel('/health')).toBe('health');
    expect(routeLabel('/.well-known/oauth-protected-resource/mcp')).toBe(
      'well_known',
    );
    expect(routeLabel('/wp-admin/x.php')).toBe('other');
    expect(routeLabel(undefined)).toBe('other');
  });
});

describe('McpMetrics', () => {
  it('conta por rótulo e nunca cria série com valor fora da lista', async () => {
    const metrics = new McpMetrics();

    for (let i = 0; i < 300; i += 1) {
      metrics.toolCall(`ferramenta-${i}`, 'ok', 0.1);
      metrics.rpcRequest(`metodo-${i}`);
      metrics.clientRequest(`agente-${i}`);
      metrics.httpRequest(`/rota/${i}`, 200);
      metrics.upstreamRequest(`/applications/${i}`, '200', 0.1);
    }

    expect(await series(metrics, 'trampo_mcp_tool_calls_total')).toHaveLength(
      1,
    );
    expect(await series(metrics, 'trampo_mcp_rpc_requests_total')).toHaveLength(
      1,
    );
    expect(
      await series(metrics, 'trampo_mcp_client_requests_total'),
    ).toHaveLength(1);
    expect(
      await series(metrics, 'trampo_mcp_http_requests_total'),
    ).toHaveLength(1);
    expect(
      await series(metrics, 'trampo_mcp_upstream_requests_total'),
    ).toHaveLength(1);
  });

  it('a saída não tem token, e-mail, UUID ou URL', async () => {
    const metrics = new McpMetrics();

    metrics.tokenKind('tfp');
    metrics.tokenValidation('ok');
    metrics.authChallenge('missing');
    metrics.toolCall('create_application', 'error', 1.2);
    metrics.upstreamRequest(
      '/applications/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      '404',
      0.2,
    );

    const text = (await metrics.registry.metrics())
      .split('\n')
      .filter((line) => line.startsWith('trampo_mcp_'))
      .join('\n');

    expect(text).not.toMatch(/@|tf[por]_|https?:\/\/|[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(text).toContain('endpoint="/applications/:id"');
  });

  it('expõe a versão e as métricas padrão do Node', async () => {
    const text = await new McpMetrics().registry.metrics();

    expect(text).toContain('trampo_mcp_build_info{');
    expect(text).toContain('nodejs_eventloop_lag_seconds');
  });
});

describe('servidor interno de métricas', () => {
  const metrics = new McpMetrics();

  it('só responde GET /metrics', async () => {
    const handle = createMetricsHandler(metrics);

    expect((await handle('/metrics', 'GET', undefined)).status).toBe(200);
    for (const [url, method] of [
      ['/', 'GET'],
      ['/mcp', 'GET'],
      ['/metrics/x', 'GET'],
      ['/metrics', 'POST'],
    ] as const) {
      expect((await handle(url, method, undefined)).status).toBe(404);
    }
  });

  it('com token, exige o Bearer certo', async () => {
    const handle = createMetricsHandler(metrics, 'segredo-de-metricas');

    expect((await handle('/metrics', 'GET', undefined)).status).toBe(401);
    expect((await handle('/metrics', 'GET', 'Bearer errado')).status).toBe(401);
    expect(
      (await handle('/metrics', 'GET', 'Bearer segredo-de-metricas')).status,
    ).toBe(200);
  });
});
