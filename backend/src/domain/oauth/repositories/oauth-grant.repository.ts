import type { OAuthGrantRecord } from '../records';

export abstract class OAuthGrantRepository {
  /**
   * Reaproveita o grant ativo da pessoa para o app (atualizando escopo e
   * recurso) ou cria um novo. Há no máximo um ativo por (usuário, app).
   */
  abstract activate(input: {
    userId: string;
    clientRef: string;
    scope: string;
    resource: string;
  }): Promise<OAuthGrantRecord>;

  abstract findById(id: string): Promise<OAuthGrantRecord | null>;

  abstract listActiveByUser(userId: string): Promise<OAuthGrantRecord[]>;

  /** Revoga se for da pessoa e estiver ativo; devolve `true` se revogou. */
  abstract revokeForUser(
    id: string,
    userId: string,
    at: Date,
  ): Promise<boolean>;

  abstract revoke(id: string, at: Date): Promise<void>;

  abstract touchLastUsed(id: string, at: Date): Promise<void>;
}
