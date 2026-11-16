import { Injectable, Optional } from '@nestjs/common';
import {
  CLAUDE_ORIGINS,
  isAllowedRedirectUri,
} from '../../../domain/oauth/redirect-uri-policy';
import { validateClientMetadata } from '../../../domain/oauth/client-metadata';
import { OAuthClientRepository } from '../../../domain/oauth/repositories/oauth-client.repository';
import type { OAuthClientSource } from '../../../domain/oauth/records';
import { ClientMetadataFetcher } from '../../../domain/oauth/services/client-metadata-fetcher';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import { OAuthError } from '../errors/oauth.error';
import { OAuthSettings } from '../services/oauth-settings';

export type ResolvedOAuthClient = {
  clientId: string;
  name: string;
  redirectUris: string[];
  source: OAuthClientSource;
  /** CIMD publicado na origem do próprio Claude. */
  verifiedOrigin: boolean;
};

type CacheEntry = { client: ResolvedOAuthClient; expiresAt: number };

const MIN_CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

export function isClientMetadataUrl(clientId: string): boolean {
  return /^https:\/\//i.test(clientId);
}

/**
 * Resolve o `client_id`: DCR vem do banco; CIMD (um `client_id` em formato de
 * URL) é buscado, validado e guardado em cache em memória.
 */
@Injectable()
export class ResolveOAuthClientUseCase {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly clients: OAuthClientRepository,
    private readonly fetcher: ClientMetadataFetcher,
    private readonly settings: OAuthSettings,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(clientId: string): Promise<ResolvedOAuthClient> {
    if (clientId.length > 2048) {
      throw new OAuthError('invalid_request', 'client_id inválido.');
    }

    return isClientMetadataUrl(clientId)
      ? this.resolveCimd(clientId)
      : this.resolveDcr(clientId);
  }

  private async resolveDcr(clientId: string): Promise<ResolvedOAuthClient> {
    const client = await this.clients.findByClientId(clientId);

    if (!client || client.source !== 'dcr') {
      throw new OAuthError('invalid_client', 'Aplicativo desconhecido.');
    }

    return {
      clientId: client.clientId,
      name: client.name,
      redirectUris: client.redirectUris,
      source: 'dcr',
      verifiedOrigin: false,
    };
  }

  private async resolveCimd(clientId: string): Promise<ResolvedOAuthClient> {
    const cached = this.cache.get(clientId);

    if (cached && cached.expiresAt > Date.now()) {
      this.metrics.oauthCimdCache('hit');

      return cached.client;
    }

    this.metrics.oauthCimdCache('miss');

    const url = this.parseMetadataUrl(clientId);
    const startedAt = performance.now();
    const result = await this.fetcher.fetch(url.toString());
    const seconds = (): number => (performance.now() - startedAt) / 1000;

    // Falha de rede não é cacheada.
    if (!result.ok) {
      this.metrics.oauthCimdFetch(result.reason, seconds());

      throw new OAuthError(
        'invalid_client',
        'Não foi possível obter os metadados do aplicativo.',
      );
    }

    const document = result.document;

    if (
      typeof document !== 'object' ||
      document === null ||
      Array.isArray(document) ||
      (document as Record<string, unknown>).client_id !== clientId
    ) {
      this.metrics.oauthCimdFetch('invalid', seconds());

      throw new OAuthError(
        'invalid_client',
        'O client_id do documento não é igual à sua URL.',
      );
    }

    const metadata = validateClientMetadata(
      document as Record<string, unknown>,
      this.settings.extraRedirectUris,
    );

    if (!metadata.ok) {
      this.metrics.oauthCimdFetch('invalid', seconds());

      throw new OAuthError('invalid_client', metadata.description);
    }

    this.metrics.oauthCimdFetch('ok', seconds());

    const client: ResolvedOAuthClient = {
      clientId,
      name: metadata.value.name,
      redirectUris: metadata.value.redirectUris,
      source: 'cimd',
      verifiedOrigin: CLAUDE_ORIGINS.includes(url.origin),
    };
    const ttl = Math.min(
      Math.max((result.maxAgeSeconds ?? 0) * 1000, MIN_CACHE_MS),
      MAX_CACHE_MS,
    );

    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      this.cache.clear();
    }

    this.cache.set(clientId, { client, expiresAt: Date.now() + ttl });

    return client;
  }

  /** `https` com caminho; sem credenciais, fragmento ou segmentos de navegação. */
  private parseMetadataUrl(clientId: string): URL {
    let url: URL;

    try {
      url = new URL(clientId);
    } catch {
      throw new OAuthError('invalid_client', 'client_id inválido.');
    }

    if (
      url.protocol !== 'https:' ||
      url.pathname === '/' ||
      url.hash ||
      url.username ||
      url.password ||
      url.toString() !== clientId ||
      isAllowedRedirectUri(clientId)
    ) {
      throw new OAuthError('invalid_client', 'client_id inválido.');
    }

    return url;
  }
}
