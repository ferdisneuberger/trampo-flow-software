import { Injectable } from '@nestjs/common';
import { accessScopes } from '../../../domain/oauth/scopes';
import { OAuthClientRepository } from '../../../domain/oauth/repositories/oauth-client.repository';
import { OAuthGrantRepository } from '../../../domain/oauth/repositories/oauth-grant.repository';

export type OAuthGrantView = {
  id: string;
  clientName: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
};

@Injectable()
export class ListOAuthGrantsUseCase {
  constructor(
    private readonly grants: OAuthGrantRepository,
    private readonly clients: OAuthClientRepository,
  ) {}

  async execute(userId: string): Promise<OAuthGrantView[]> {
    const grants = await this.grants.listActiveByUser(userId);
    const clients = await this.clients.findByIds([
      ...new Set(grants.map((grant) => grant.clientRef)),
    ]);
    const names = new Map(clients.map((client) => [client.id, client.name]));

    return grants.map((grant) => ({
      id: grant.id,
      clientName: names.get(grant.clientRef) ?? 'Aplicativo removido',
      scopes: accessScopes(grant.scope),
      createdAt: grant.createdAt,
      lastUsedAt: grant.lastUsedAt,
    }));
  }
}
