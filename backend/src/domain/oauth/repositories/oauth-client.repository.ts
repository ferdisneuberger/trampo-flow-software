import type { OAuthClientRecord } from '../records';

export abstract class OAuthClientRepository {
  abstract create(client: OAuthClientRecord): Promise<void>;

  /** Cria ou atualiza (nome e redirects) o cliente CIMD pelo `client_id` (a URL). */
  abstract upsertCimd(
    client: Omit<OAuthClientRecord, 'lastUsedAt'>,
  ): Promise<OAuthClientRecord>;

  abstract findByClientId(clientId: string): Promise<OAuthClientRecord | null>;

  abstract findByIds(ids: string[]): Promise<OAuthClientRecord[]>;

  abstract countBySource(source: 'dcr' | 'cimd'): Promise<number>;

  abstract touchLastUsed(id: string, at: Date): Promise<void>;

  /** Remove clientes DCR sem grants criados antes de `olderThan`. */
  abstract deleteUnusedDcr(olderThan: Date): Promise<number>;
}
