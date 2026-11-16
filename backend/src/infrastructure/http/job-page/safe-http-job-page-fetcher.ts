import {
  JobPageFetcher,
  type JobPageFetchResult,
} from '../../../domain/applications/services/job-page-fetcher';
import {
  BlockedAddressError,
  readBody,
  SafeHttpClient,
} from '../safe-http-client';

export type SafeHttpJobPageFetcherOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Só para testes: permite liberar endereços locais. */
  isAllowedAddress?: (address: string) => boolean;
  /** Só para testes: portas além de 80 e 443. */
  allowedPorts?: string[];
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BYTES = 1_500_000;
const DEFAULT_MAX_REDIRECTS = 3;
const USER_AGENT =
  'Mozilla/5.0 (compatible; TrampoFlowBot/1.0; +https://github.com/ferdisneuberger/trampo-flow-software)';

/**
 * Busca a página pública de uma vaga com proteção contra SSRF:
 * - só http/https nas portas 80 e 443;
 * - o IP é validado na resolução de DNS de cada conexão (inclusive após
 *   redirecionamentos), o que também evita DNS rebinding;
 * - redirecionamentos manuais, timeout total e limite de tamanho;
 * - só aceita HTML.
 *
 * Se a página passar do limite, usa o começo dela: os metadados ficam no
 * `<head>`.
 */
export class SafeHttpJobPageFetcher extends JobPageFetcher {
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRedirects: number;
  private readonly http: SafeHttpClient;

  constructor(options: SafeHttpJobPageFetcherOptions = {}) {
    super();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    this.http = new SafeHttpClient({
      isAllowedAddress: options.isAllowedAddress,
      allowedPorts: options.allowedPorts,
    });
  }

  async fetch(url: string): Promise<JobPageFetchResult> {
    const signal = AbortSignal.timeout(this.timeoutMs);

    try {
      let current = new URL(url);

      for (let redirects = 0; ; redirects += 1) {
        const response = await this.http.get(current, signal, HEADERS);
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location) {
          response.resume();

          if (redirects >= this.maxRedirects) {
            return { ok: false, reason: 'unreachable' };
          }

          current = new URL(location, current);
          continue;
        }

        if (status < 200 || status >= 300) {
          response.resume();

          return { ok: false, reason: 'unreachable' };
        }

        const contentType = String(response.headers['content-type'] ?? '');

        if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
          response.resume();

          return { ok: false, reason: 'not_html' };
        }

        const html = decode(
          await readBody(response, this.maxBytes, 'truncate', signal),
          contentType,
        );

        return { ok: true, html, finalUrl: current.toString() };
      }
    } catch (error) {
      if (error instanceof BlockedAddressError) {
        return { ok: false, reason: 'blocked' };
      }

      if (signal.aborted) {
        return { ok: false, reason: 'timeout' };
      }

      return { ok: false, reason: 'unreachable' };
    }
  }
}

const HEADERS = {
  'user-agent': USER_AGENT,
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
  'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

function decode(buffer: Buffer, contentType: string): string {
  const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1];

  try {
    return new TextDecoder(charset ?? 'utf-8').decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}
