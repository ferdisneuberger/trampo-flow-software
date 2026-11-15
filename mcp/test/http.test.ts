import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpHandler } from '../src/http.js';
import { API_URL, createFakeApi, makeApplication, page } from './helpers.js';

const ALICE = 'tfp_alice_token';
const BOB = 'tfp_bob_token';

let server: Server | undefined;
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = undefined;
});

/** API falsa que conhece dois usuários e devolve só as candidaturas de cada um. */
function fakeApi() {
  const tokenOf = (headers: Headers) =>
    headers.get('authorization')?.replace('Bearer ', '');

  return createFakeApi({
    'GET /auth/whoami': ({ headers }) =>
      [ALICE, BOB].includes(tokenOf(headers) ?? '')
        ? { body: { id: tokenOf(headers), email: 'x@example.com' } }
        : { status: 401, body: { message: 'Token inválido' } },
    'GET /applications': ({ headers }) =>
      page([
        makeApplication({
          company:
            tokenOf(headers) === ALICE ? 'Empresa da Alice' : 'Empresa do Bob',
        }),
      ]),
  });
}

async function start(api = fakeApi(), tokenCacheMs?: number) {
  server = createServer(
    createHttpHandler({
      apiUrl: API_URL,
      timeoutMs: 5000,
      fetch: api.fetchMock,
      tokenCacheMs,
    }),
  );
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return { api, base: `http://127.0.0.1:${port}` };
}

async function connect(base: string, token: string) {
  const client = new Client({ name: 'test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  clients.push(client);
  return client;
}

function textOf(result: unknown): string {
  const content = (result as { content: { type: string; text: string }[] })
    .content;
  return content[0]?.text ?? '';
}

describe('MCP via HTTP', () => {
  it('conecta, lista as tools e chama a API com o token de quem chamou', async () => {
    const { base, api } = await start();
    const client = await connect(base, ALICE);

    const { tools } = await client.listTools();
    const result = await client.callTool({
      name: 'list_applications',
      arguments: {},
    });

    expect(tools).toHaveLength(7);
    expect(textOf(result)).toContain('Empresa da Alice');
    const listCall = api.calls.find((c) => c.path === '/applications');
    expect(listCall?.headers.get('authorization')).toBe(`Bearer ${ALICE}`);
  });

  it('isola usuários: cada token só vê os próprios dados', async () => {
    const { base } = await start();
    const alice = await connect(base, ALICE);
    const bob = await connect(base, BOB);

    const [a, b] = await Promise.all([
      alice.callTool({ name: 'list_applications', arguments: {} }),
      bob.callTool({ name: 'list_applications', arguments: {} }),
    ]);

    expect(textOf(a)).toContain('Empresa da Alice');
    expect(textOf(a)).not.toContain('Empresa do Bob');
    expect(textOf(b)).toContain('Empresa do Bob');
  });

  it('valida o token uma vez e reaproveita por um tempo', async () => {
    const { base, api } = await start();
    const client = await connect(base, ALICE);

    await client.listTools();
    await client.callTool({ name: 'list_applications', arguments: {} });

    expect(api.calls.filter((c) => c.path === '/auth/whoami')).toHaveLength(1);
  });

  it.each([
    ['sem Authorization', undefined],
    ['com JWT em vez de tfp_', 'Bearer eyJhbGciOi.x.y'],
  ])('responde 401 %s', async (_label, authorization) => {
    const { base } = await start();

    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Bearer/);
    expect(await response.text()).toMatch(/Tokens de integração/);
  });

  it('responde 401 para token revogado, sem ecoar o token', async () => {
    const { base } = await start();

    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tfp_revogado',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const body = await response.text();

    expect(response.status).toBe(401);
    expect(body).toMatch(/revogado/);
    expect(body).not.toContain('tfp_revogado');
  });

  it('recusa GET, rotas desconhecidas e corpo grande demais', async () => {
    const { base } = await start();
    const auth = {
      Authorization: `Bearer ${ALICE}`,
      'Content-Type': 'application/json',
    };

    expect((await fetch(`${base}/mcp`)).status).toBe(405);
    expect((await fetch(`${base}/outra`)).status).toBe(404);
    expect((await fetch(`${base}/health`)).status).toBe(200);

    const big = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: auth,
      body: 'x'.repeat(1024 * 1024 + 1),
    });
    expect(big.status).toBe(413);

    const invalid = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: auth,
      body: '{',
    });
    expect(invalid.status).toBe(400);
  });

  it('responde 502 quando a API está fora', async () => {
    const { base } = await start(
      createFakeApi({ 'GET /auth/whoami': { status: 503 } }),
    );

    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ALICE}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });

    expect(response.status).toBe(502);
  });
});
