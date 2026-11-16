import { createServer, type Server } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
import { SERVER_VERSION } from './server.js';

const SECONDS_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15,
];

const TOOLS = [
  'preview_job_posting',
  'create_application',
  'list_applications',
  'get_application',
  'update_application',
  'move_application',
  'pipeline_summary',
];
const RPC_METHODS = [
  'initialize',
  'tools/list',
  'tools/call',
  'prompts/list',
  'prompts/get',
  'ping',
];
const ENDPOINTS = [
  '/auth/whoami',
  '/applications',
  '/applications/preview',
  '/applications/board',
  '/applications/stats',
  '/applications/:id',
  '/applications/:id/placement',
];

/** Só deixa passar valores da lista fechada; o resto vira `other`. */
function pick(value: string, allowed: readonly string[]): string {
  return allowed.includes(value) ? value : 'other';
}

/** Agente que fez a chamada, em categorias fechadas (nunca o texto do User-Agent). */
export function classifyClient(...hints: (string | undefined)[]): string {
  const text = hints.filter(Boolean).join(' ').toLowerCase();

  if (/claude[-_ ]?code/.test(text)) return 'claude_code';
  if (/claude/.test(text)) return 'claude';
  if (/cursor/.test(text)) return 'cursor';
  if (/vscode|visual studio code|copilot/.test(text)) return 'vscode';
  if (/opencode/.test(text)) return 'opencode';

  return 'other';
}

/** Rota da API como template: UUID vira `:id` e a query é descartada. */
export function endpointLabel(path: string): string {
  const template = path
    .split('?')[0]!
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id',
    );

  return pick(template, ENDPOINTS);
}

/** Método JSON-RPC (o primeiro, em lote) numa lista fechada. */
export function rpcMethodLabel(body: unknown): string {
  const first: unknown = Array.isArray(body) ? (body[0] as unknown) : body;
  const method = (first as { method?: unknown } | null)?.method;

  return typeof method === 'string' ? pick(method, RPC_METHODS) : 'other';
}

/** Nome do cliente informado no `initialize` (`params.clientInfo.name`), se houver. */
export function clientInfoName(body: unknown): string | undefined {
  const first: unknown = Array.isArray(body) ? (body[0] as unknown) : body;
  const name = (
    first as { params?: { clientInfo?: { name?: unknown } } } | null
  )?.params?.clientInfo?.name;

  return typeof name === 'string' ? name : undefined;
}

export function routeLabel(url: string | undefined): string {
  const path = (url ?? '/').split('?')[0];

  if (path === '/mcp') return 'mcp';
  if (path === '/health') return 'health';
  if (path?.startsWith('/.well-known/oauth-protected-resource'))
    return 'well_known';

  return 'other';
}

/**
 * Métricas do serviço MCP, com `Registry` próprio e rótulos de listas fechadas.
 * Nunca lança: instrumentação não pode derrubar uma chamada de ferramenta.
 */
export class McpMetrics {
  readonly registry = new Registry();

  private readonly http = new Counter({
    name: 'trampo_mcp_http_requests_total',
    help: 'Requisições HTTP ao MCP por rota e status.',
    labelNames: ['route', 'status'],
    registers: [this.registry],
  });
  private readonly rpc = new Counter({
    name: 'trampo_mcp_rpc_requests_total',
    help: 'Chamadas JSON-RPC por método.',
    labelNames: ['method'],
    registers: [this.registry],
  });
  private readonly tools = new Counter({
    name: 'trampo_mcp_tool_calls_total',
    help: 'Chamadas de ferramenta por nome e resultado.',
    labelNames: ['tool', 'result'],
    registers: [this.registry],
  });
  private readonly toolDuration = new Histogram({
    name: 'trampo_mcp_tool_duration_seconds',
    help: 'Duração das chamadas de ferramenta.',
    labelNames: ['tool'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });
  private readonly challenges = new Counter({
    name: 'trampo_mcp_auth_challenges_total',
    help: 'Respostas 401 por motivo (as sem token iniciam o login OAuth).',
    labelNames: ['reason'],
    registers: [this.registry],
  });
  private readonly tokenKinds = new Counter({
    name: 'trampo_mcp_token_kind_total',
    help: 'Requisições por tipo de credencial (tfp = token de integração, tfo = OAuth).',
    labelNames: ['kind'],
    registers: [this.registry],
  });
  private readonly validations = new Counter({
    name: 'trampo_mcp_token_validation_total',
    help: 'Validações de token por resultado (cache_hit evita uma ida à API).',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly clients = new Counter({
    name: 'trampo_mcp_client_requests_total',
    help: 'Requisições por agente (classificado em categorias fechadas).',
    labelNames: ['client'],
    registers: [this.registry],
  });
  private readonly upstream = new Counter({
    name: 'trampo_mcp_upstream_requests_total',
    help: 'Chamadas do MCP à API por rota (template) e status.',
    labelNames: ['endpoint', 'status'],
    registers: [this.registry],
  });
  private readonly upstreamDuration = new Histogram({
    name: 'trampo_mcp_upstream_duration_seconds',
    help: 'Duração das chamadas do MCP à API.',
    labelNames: ['endpoint'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });
  private readonly buildInfo = new Gauge({
    name: 'trampo_mcp_build_info',
    help: 'Versão do servidor MCP (valor sempre 1).',
    labelNames: ['version', 'node'],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.buildInfo.set({ version: SERVER_VERSION, node: process.version }, 1);
  }

  private safe(action: () => void): void {
    try {
      action();
    } catch (error) {
      console.error(
        '[trampo-flow-mcp] falha ao registrar métrica:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  httpRequest(route: string, status: number): void {
    this.safe(() =>
      this.http.inc({
        route: pick(route, ['mcp', 'health', 'well_known']),
        status: String(status),
      }),
    );
  }

  rpcRequest(method: string): void {
    this.safe(() => this.rpc.inc({ method: pick(method, RPC_METHODS) }));
  }

  toolCall(tool: string, result: 'ok' | 'error', seconds: number): void {
    this.safe(() => {
      const name = pick(tool, TOOLS);

      this.tools.inc({ tool: name, result });
      this.toolDuration.observe({ tool: name }, seconds);
    });
  }

  authChallenge(
    reason: 'missing' | 'invalid_token' | 'unsupported_token',
  ): void {
    this.safe(() => this.challenges.inc({ reason }));
  }

  tokenKind(kind: 'tfp' | 'tfo'): void {
    this.safe(() => this.tokenKinds.inc({ kind }));
  }

  tokenValidation(
    result: 'cache_hit' | 'ok' | 'invalid' | 'upstream_error',
  ): void {
    this.safe(() => this.validations.inc({ result }));
  }

  clientRequest(client: string): void {
    this.safe(() =>
      this.clients.inc({
        client: pick(client, [
          'claude',
          'claude_code',
          'cursor',
          'vscode',
          'opencode',
        ]),
      }),
    );
  }

  upstreamRequest(path: string, status: string, seconds: number): void {
    this.safe(() => {
      const endpoint = endpointLabel(path);

      this.upstream.inc({ endpoint, status });
      this.upstreamDuration.observe({ endpoint }, seconds);
    });
  }
}

/**
 * Servidor interno das métricas (porta própria, fora do `/mcp` que o ingress
 * publica). Só responde `GET /metrics`; com token configurado, exige o Bearer.
 */
export function createMetricsHandler(metrics: McpMetrics, token?: string) {
  return async (
    url: string | undefined,
    method: string | undefined,
    authorization: string | undefined,
  ): Promise<{ status: number; body: string; type: string }> => {
    if ((url ?? '/').split('?')[0] !== '/metrics' || method !== 'GET') {
      return { status: 404, body: 'Not found', type: 'text/plain' };
    }

    if (token) {
      const given = Buffer.from(
        authorization?.replace(/^Bearer\s+/i, '') ?? '',
      );
      const expected = Buffer.from(token);

      if (
        given.length !== expected.length ||
        !timingSafeEqual(given, expected)
      ) {
        return { status: 401, body: 'Unauthorized', type: 'text/plain' };
      }
    }

    return {
      status: 200,
      body: await metrics.registry.metrics(),
      type: metrics.registry.contentType,
    };
  };
}

export function startMetricsServer(
  metrics: McpMetrics,
  options: { port: number; token?: string },
): Server {
  const handle = createMetricsHandler(metrics, options.token);
  const server = createServer((request, response) => {
    void handle(
      request.url,
      request.method,
      request.headers.authorization,
    ).then(({ status, body, type }) => {
      response.writeHead(status, { 'Content-Type': type });
      response.end(body);
    });
  });

  server.on('error', (error) => {
    console.error(
      `[trampo-flow-mcp] servidor de métricas não iniciou: ${error.message}`,
    );
  });
  server.listen(options.port, '0.0.0.0', () => {
    console.error(`[trampo-flow-mcp] métricas em :${options.port}/metrics`);
  });

  return server;
}
