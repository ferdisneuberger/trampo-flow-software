import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { vi } from 'vitest';
import { TrampoApiClient } from '../src/api-client.js';
import { createServer } from '../src/server.js';
import type { Application } from '../src/types.js';

export const API_URL = 'https://api.test/api';
export const TOKEN = 'tfp_test_secret_value';

export type Call = {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  headers: Headers;
};
type Reply = { status?: number; body?: unknown };
type Handler = (call: Call) => Reply | undefined;

/** fetch falso: cada rota "METHOD /path" responde com o handler registrado. */
export function createFakeApi(routes: Record<string, Handler | Reply>) {
  const calls: Call[] = [];

  const fetchMock = vi.fn(
    // eslint-disable-next-line @typescript-eslint/require-await
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      const call: Call = {
        method: init?.method ?? 'GET',
        path: url.pathname.replace(/^\/api/, ''),
        query: Object.fromEntries(url.searchParams),
        body:
          typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        headers: new Headers(init?.headers),
      };
      calls.push(call);

      const route = routes[`${call.method} ${call.path}`];
      const reply = typeof route === 'function' ? route(call) : route;

      if (!reply) {
        return new Response(
          JSON.stringify({
            message: `rota não mockada: ${call.method} ${call.path}`,
          }),
          { status: 404 },
        );
      }

      return new Response(
        reply.body === undefined ? null : JSON.stringify(reply.body),
        {
          status: reply.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    },
  );

  return { fetchMock, calls };
}

export async function connect(routes: Record<string, Handler | Reply>) {
  const api = createFakeApi(routes);
  const client = new TrampoApiClient({
    apiUrl: API_URL,
    token: TOKEN,
    timeoutMs: 5000,
    fetch: api.fetchMock,
  });
  const server = createServer(client);
  const mcp = new Client({ name: 'test', version: '0.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    mcp.connect(clientTransport),
  ]);

  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = (await mcp.callTool({
      name,
      arguments: args,
    })) as CallToolResult;
    const first = result.content[0];
    const text = first?.type === 'text' ? first.text : '';
    let json: unknown = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return { result, text, json: json as Record<string, any> };
  }

  return { mcp, call, calls: api.calls, close: () => mcp.close() };
}

const DAY = 24 * 60 * 60 * 1000;

export function makeApplication(
  overrides: Partial<Application> & { daysAgo?: number } = {},
): Application {
  const { daysAgo = 0, ...rest } = overrides;
  const updatedAt = new Date(Date.now() - daysAgo * DAY).toISOString();

  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Pessoa Desenvolvedora Backend',
    link: 'https://jobs.example.com/vaga/123',
    company: 'Haytek',
    companyUrl: 'https://haytek.com.br',
    position: 1024,
    status: 'PENDING',
    currentPhase: 'Candidatura enviada',
    createdAt: updatedAt,
    updatedAt,
    deletedAt: null,
    ...rest,
  };
}

export const page = (items: Application[], hasMore = false) => ({
  body: { items, nextCursor: null, hasMore },
});
