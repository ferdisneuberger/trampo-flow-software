import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { isPublicAddress } from './job-page/public-address';

export type SafeHttpClientOptions = {
  /** Só para testes: permite liberar endereços locais. */
  isAllowedAddress?: (address: string) => boolean;
  /** Só para testes: portas além de 80 e 443. */
  allowedPorts?: string[];
  /** Protocolos aceitos (padrão: http e https). */
  allowedProtocols?: string[];
};

export class BlockedAddressError extends Error {
  constructor() {
    super('Endereço bloqueado.');
  }
}

export class BodyTooLargeError extends Error {
  constructor() {
    super('Corpo grande demais.');
  }
}

/**
 * Cliente HTTP com proteção contra SSRF, compartilhado pelo extrator de vagas
 * e pelo CIMD:
 * - só as portas 80 e 443 (e os protocolos permitidos), sem credenciais na URL;
 * - o IP é validado na resolução de DNS de cada conexão, o que também evita
 *   DNS rebinding; IP literal é validado antes de conectar;
 * - não segue redirecionamento (quem chama decide, URL por URL).
 */
export class SafeHttpClient {
  private readonly isAllowedAddress: (address: string) => boolean;
  private readonly allowedPorts: Set<string>;
  private readonly allowedProtocols: Set<string>;

  constructor(options: SafeHttpClientOptions = {}) {
    this.isAllowedAddress = options.isAllowedAddress ?? isPublicAddress;
    this.allowedPorts = new Set([
      '',
      '80',
      '443',
      ...(options.allowedPorts ?? []),
    ]);
    this.allowedProtocols = new Set(
      options.allowedProtocols ?? ['http:', 'https:'],
    );
  }

  assertAllowedUrl(url: URL): void {
    if (!this.allowedProtocols.has(url.protocol)) {
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

  get(
    url: URL,
    signal: AbortSignal,
    headers: Record<string, string>,
  ): Promise<IncomingMessage> {
    this.assertAllowedUrl(url);

    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const req = request(
        url,
        { method: 'GET', signal, lookup: this.guardedLookup, headers },
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
}

/**
 * Lê o corpo até `maxBytes`. Se passar do limite, `onLimit: 'truncate'` usa o
 * começo e `'fail'` rejeita com `BodyTooLargeError`.
 */
export function readBody(
  response: IncomingMessage,
  maxBytes: number,
  onLimit: 'truncate' | 'fail',
  signal: AbortSignal,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      resolve(Buffer.concat(chunks));
    };

    response.on('data', (chunk: Buffer) => {
      if (finished) return;

      const remaining = maxBytes - size;

      if (chunk.length > remaining) {
        if (onLimit === 'fail') {
          finished = true;
          response.destroy();
          reject(new BodyTooLargeError());
          return;
        }

        chunks.push(chunk.subarray(0, remaining));
        size = maxBytes;
        response.destroy();
        finish();
        return;
      }

      chunks.push(chunk);
      size += chunk.length;

      if (size === maxBytes && onLimit === 'truncate') {
        response.destroy();
        finish();
      }
    });
    response.on('end', finish);
    response.on('error', (error) => {
      if (!finished) {
        finished = true;
        reject(signal.aborted ? error : new Error('Falha ao ler a resposta.'));
      }
    });
  });
}
