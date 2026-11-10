import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import {
  JobPageFetcher,
  type JobPageFetchResult,
} from '../../../domain/applications/services/job-page-fetcher';
import { isPublicAddress } from './public-address';

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

class BlockedAddressError extends Error {
  constructor() {
    super('Endereço bloqueado.');
  }
}

class UnreachableError extends Error {}

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
  private readonly isAllowedAddress: (address: string) => boolean;
  private readonly allowedPorts: Set<string>;

  constructor(options: SafeHttpJobPageFetcherOptions = {}) {
    super();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    this.isAllowedAddress = options.isAllowedAddress ?? isPublicAddress;
    this.allowedPorts = new Set([
      '',
      '80',
      '443',
      ...(options.allowedPorts ?? []),
    ]);
  }

  async fetch(url: string): Promise<JobPageFetchResult> {
    const signal = AbortSignal.timeout(this.timeoutMs);

    try {
      let current = new URL(url);

      for (let redirects = 0; ; redirects += 1) {
        this.assertAllowedUrl(current);

        const response = await this.get(current, signal);
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

        const html = await this.readBody(response, contentType, signal);

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

  private assertAllowedUrl(url: URL): void {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BlockedAddressError();
    }

    if (url.username || url.password || !this.allowedPorts.has(url.port)) {
      throw new BlockedAddressError();
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '');

    // IP literal não passa pela resolução de DNS: valida aqui.
    if (isIP(hostname) && !this.isAllowedAddress(hostname)) {
      throw new BlockedAddressError();
    }
  }

  private get(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          method: 'GET',
          signal,
          lookup: this.guardedLookup,
          headers: {
            'user-agent': USER_AGENT,
            accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
            'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
        },
        resolve,
      );

      req.on('error', reject);
      req.end();
    });
  }

  /** Resolve o DNS e recusa a conexão se qualquer IP for interno. */
  private readonly guardedLookup: LookupFunction = (
    hostname,
    options,
    callback,
  ) => {
    dnsLookup(hostname, { all: true }, (error, addresses) => {
      if (error) {
        callback(error, '', 0);
        return;
      }

      const list = addresses;

      if (
        list.length === 0 ||
        list.some((entry) => !this.isAllowedAddress(entry.address))
      ) {
        callback(new BlockedAddressError(), '', 0);
        return;
      }

      if (options.all) {
        (
          callback as unknown as (
            error: null,
            addresses: LookupAddress[],
          ) => void
        )(null, list);
        return;
      }

      const [first] = list;

      callback(null, first?.address ?? '', first?.family ?? 4);
    });
  };

  private readBody(
    response: IncomingMessage,
    contentType: string,
    signal: AbortSignal,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        resolve(decode(Buffer.concat(chunks), contentType));
      };

      response.on('data', (chunk: Buffer) => {
        if (finished) return;

        const remaining = this.maxBytes - size;

        if (chunk.length >= remaining) {
          chunks.push(chunk.subarray(0, remaining));
          size = this.maxBytes;
          response.destroy();
          finish();
          return;
        }

        chunks.push(chunk);
        size += chunk.length;
      });
      response.on('end', finish);
      response.on('error', (error) => {
        if (!finished) reject(signal.aborted ? error : new UnreachableError());
      });
    });
  }
}

function decode(buffer: Buffer, contentType: string): string {
  const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1];

  try {
    return new TextDecoder(charset ?? 'utf-8').decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}
