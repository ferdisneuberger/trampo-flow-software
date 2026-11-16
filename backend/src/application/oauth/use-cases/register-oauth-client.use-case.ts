import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { validateClientMetadata } from '../../../domain/oauth/client-metadata';
import { OAuthClientRepository } from '../../../domain/oauth/repositories/oauth-client.repository';
import { OAuthTokenGenerator } from '../../../domain/oauth/services/oauth-token-generator';
import { OAUTH_SUPPORTED_SCOPES } from '../../../domain/oauth/scopes';
import { parseScope } from '../../../domain/auth/scopes';
import { OAuthError } from '../errors/oauth.error';
import { OAuthSettings } from '../services/oauth-settings';

export type RegisteredOAuthClient = {
  client_id: string;
  client_id_issued_at: number;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: 'none';
  scope?: string;
};

/** Registro dinâmico (RFC 7591): só clientes públicos, sem `client_secret`. */
@Injectable()
export class RegisterOAuthClientUseCase {
  constructor(
    private readonly clients: OAuthClientRepository,
    private readonly generator: OAuthTokenGenerator,
    private readonly settings: OAuthSettings,
  ) {}

  async execute(
    input: Record<string, unknown>,
  ): Promise<RegisteredOAuthClient> {
    const metadata = validateClientMetadata(
      input,
      this.settings.extraRedirectUris,
    );

    if (!metadata.ok) {
      throw new OAuthError(metadata.error, metadata.description);
    }

    const scope = input.scope;

    if (scope !== undefined) {
      if (
        typeof scope !== 'string' ||
        parseScope(scope).some(
          (item) =>
            !(OAUTH_SUPPORTED_SCOPES as readonly string[]).includes(item),
        )
      ) {
        throw new OAuthError(
          'invalid_client_metadata',
          'scope contém itens não suportados.',
        );
      }
    }

    if ((await this.clients.countBySource('dcr')) >= this.settings.maxClients) {
      throw new OAuthError(
        'temporarily_unavailable',
        'Limite de aplicativos registrados atingido.',
        503,
      );
    }

    const now = new Date();
    const clientId = this.generator.clientId();

    await this.clients.create({
      id: randomUUID(),
      clientId,
      name: metadata.value.name,
      redirectUris: metadata.value.redirectUris,
      source: 'dcr',
      createdAt: now,
      lastUsedAt: null,
    });

    return {
      client_id: clientId,
      client_id_issued_at: Math.floor(now.getTime() / 1000),
      client_name: metadata.value.name,
      redirect_uris: metadata.value.redirectUris,
      grant_types: metadata.value.grantTypes,
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      ...(typeof scope === 'string' ? { scope } : {}),
    };
  }
}
