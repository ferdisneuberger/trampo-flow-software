import { createHash } from 'node:crypto';
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ApiError, TrampoApiClient } from './api-client.js';
import { createServer } from './server.js';

export type HttpOptions = {
  /** URL da API vista pelo MCP (em produção, a rede interna: http://api:3000). */
  apiUrl: string;
  timeoutMs: number;
  maxBodyBytes?: number;
  /** Por quanto tempo um token já validado dispensa nova checagem em /auth/me. */
  tokenCacheMs?: number;
  fetch?: typeof fetch;
  now?: () => number;
};

const MCP_PATH = '/mcp';
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_TOKEN_CACHE_MS = 60_000;
const MAX_CACHED_TOKENS = 10_000;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  if (res.headersSent) {
    return;
  }

  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function sendRpcError(
  res: ServerResponse,
  status: number,
  message: string,
  headers: Record<string, string> = {},
): void {
  sendJson(
    res,
    status,
    { jsonrpc: '2.0', error: { code: -32000, message }, id: null },
    headers,
  );
}

function readBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, token, ...rest] = header.trim().split(/\s+/);

  return scheme?.toLowerCase() === 'bearer' && token && rest.length === 0
    ? token
    : null;
}

async function readJsonBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;

    if (size > maxBytes) {
      throw new HttpError(413, 'Corpo da requisição grande demais.');
    }

    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}

/**
 * Servidor MCP remoto (Streamable HTTP, sem estado). Cada requisição traz o
 * token de integração do próprio usuário (`Authorization: Bearer tfp_...`),
 * que é repassado à API: o MCP não guarda segredo nenhum e cada pessoa só
 * enxerga a própria conta.
 */
export function createHttpHandler(options: HttpOptions): RequestListener {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const tokenCacheMs = options.tokenCacheMs ?? DEFAULT_TOKEN_CACHE_MS;
  const now = options.now ?? Date.now;
  // Só o hash do token fica em memória, com validade curta.
  const validTokens = new Map<string, number>();

  function clientFor(token: string): TrampoApiClient {
    return new TrampoApiClient({
      apiUrl: options.apiUrl,
      token,
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
    });
  }

  async function ensureValidToken(token: string): Promise<void> {
    const key = createHash('sha256').update(token).digest('hex');
    const expiresAt = validTokens.get(key);

    if (expiresAt && expiresAt > now()) {
      return;
    }

    await clientFor(token).getMe();

    if (validTokens.size >= MAX_CACHED_TOKENS) {
      validTokens.clear();
    }

    validTokens.set(key, now() + tokenCacheMs);
  }

  async function handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const path = (req.url ?? '/').split('?')[0];

    if (path === '/health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (path !== MCP_PATH) {
      sendJson(res, 404, { message: 'Não encontrado. O endpoint MCP é /mcp.' });
      return;
    }

    if (req.method !== 'POST') {
      // Sem estado: não há stream GET nem sessão para encerrar com DELETE.
      sendRpcError(res, 405, 'Método não permitido.', { Allow: 'POST' });
      return;
    }

    const token = readBearer(req);

    if (!token?.startsWith('tfp_')) {
      sendRpcError(
        res,
        401,
        'Envie um token de integração em Authorization: Bearer tfp_... (crie em Configurações → Tokens de integração).',
        { 'WWW-Authenticate': 'Bearer realm="trampo-flow"' },
      );
      return;
    }

    try {
      await ensureValidToken(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sendRpcError(res, 401, error.message, {
          'WWW-Authenticate':
            'Bearer realm="trampo-flow", error="invalid_token"',
        });
        return;
      }

      sendRpcError(
        res,
        502,
        error instanceof ApiError
          ? error.message
          : 'Falha ao validar o token na API.',
      );
      return;
    }

    const body = await readJsonBody(req, maxBodyBytes);
    const server = createServer(clientFor(token));
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }

  return (req, res) => {
    handle(req, res).catch((error: unknown) => {
      if (error instanceof HttpError) {
        sendRpcError(res, error.status, error.message);
        return;
      }

      console.error(
        '[trampo-flow-mcp] erro no handler HTTP:',
        error instanceof Error ? error.message : error,
      );
      sendRpcError(res, 500, 'Erro interno do servidor MCP.');
    });
  };
}
