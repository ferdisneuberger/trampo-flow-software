import {
  ClientMetadataFetcher,
  type ClientMetadataFetchResult,
} from '../../domain/oauth/services/client-metadata-fetcher';
import {
  BlockedAddressError,
  BodyTooLargeError,
  readBody,
  SafeHttpClient,
  type SafeHttpClientOptions,
} from '../http/safe-http-client';

export type SafeHttpClientMetadataFetcherOptions = SafeHttpClientOptions & {
  timeoutMs?: number;
  maxBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BYTES = 16 * 1024;

/**
 * Busca o documento de metadados de um cliente CIMD: só `https` (443), sem
 * seguir redirecionamento, no máximo 5 s, corpo de até 16 KB e `Content-Type`
 * JSON. Endereços internos são recusados (anti-SSRF, no DNS de cada conexão).
 */
export class SafeHttpClientMetadataFetcher extends ClientMetadataFetcher {
  private readonly http: SafeHttpClient;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;

  constructor(options: SafeHttpClientMetadataFetcherOptions = {}) {
    super();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.http = new SafeHttpClient({
      ...options,
      allowedProtocols: options.allowedProtocols ?? ['https:'],
    });
  }

  async fetch(url: string): Promise<ClientMetadataFetchResult> {
    const signal = AbortSignal.timeout(this.timeoutMs);

    try {
      const response = await this.http.get(new URL(url), signal, {
        accept: 'application/json',
        'user-agent': 'TrampoFlowOAuth/1.0',
      });
      const status = response.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        response.resume();

        return { ok: false, reason: 'redirect' };
      }

      if (status !== 200) {
        response.resume();

        return { ok: false, reason: 'unreachable' };
      }

      if (
        !/^application\/(?:[\w.+-]+\+)?json\b/i.test(
          String(response.headers['content-type'] ?? ''),
        )
      ) {
        response.resume();

        return { ok: false, reason: 'not_json' };
      }

      const body = await readBody(response, this.maxBytes, 'fail', signal);
      let document: unknown;

      try {
        document = JSON.parse(body.toString('utf8'));
      } catch {
        return { ok: false, reason: 'not_json' };
      }

      const maxAge = /max-age=(\d+)/i.exec(
        String(response.headers['cache-control'] ?? ''),
      );

      return {
        ok: true,
        document,
        maxAgeSeconds: maxAge?.[1] ? Number(maxAge[1]) : null,
      };
    } catch (error) {
      if (error instanceof BlockedAddressError) {
        return { ok: false, reason: 'blocked' };
      }

      if (error instanceof BodyTooLargeError) {
        return { ok: false, reason: 'too_large' };
      }

      return { ok: false, reason: signal.aborted ? 'timeout' : 'unreachable' };
    }
  }
}
