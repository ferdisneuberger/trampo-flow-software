export type ClientMetadataFetchResult =
  | {
      ok: true;
      document: unknown;
      /** `max-age` do `Cache-Control`, se houver. */
      maxAgeSeconds: number | null;
    }
  | {
      ok: false;
      reason:
        | 'blocked'
        | 'unreachable'
        | 'timeout'
        | 'not_json'
        | 'too_large'
        | 'redirect';
    };

/** Busca o documento de metadados de um cliente CIMD (porta; a implementação trata de SSRF). */
export abstract class ClientMetadataFetcher {
  abstract fetch(url: string): Promise<ClientMetadataFetchResult>;
}
