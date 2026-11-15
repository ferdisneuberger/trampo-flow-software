import { randomUUID } from 'node:crypto';
import type {
  OAuthAccessTokenRecord,
  OAuthClientRecord,
  OAuthCodeRecord,
  OAuthGrantRecord,
  OAuthRefreshTokenRecord,
} from '../../src/domain/oauth/records';
import { OAuthClientRepository } from '../../src/domain/oauth/repositories/oauth-client.repository';
import { OAuthCodeRepository } from '../../src/domain/oauth/repositories/oauth-code.repository';
import { OAuthGrantRepository } from '../../src/domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../src/domain/oauth/repositories/oauth-token.repository';

export class InMemoryOAuthClientRepository implements OAuthClientRepository {
  readonly clients = new Map<string, OAuthClientRecord>();

  async create(client: OAuthClientRecord): Promise<void> {
    this.clients.set(client.id, { ...client });
  }

  async upsertCimd(
    client: Omit<OAuthClientRecord, 'lastUsedAt'>,
  ): Promise<OAuthClientRecord> {
    const existing = [...this.clients.values()].find(
      (item) => item.clientId === client.clientId,
    );
    const record: OAuthClientRecord = existing
      ? { ...existing, name: client.name, redirectUris: client.redirectUris }
      : { ...client, lastUsedAt: null };

    this.clients.set(record.id, record);

    return { ...record };
  }

  async findByClientId(clientId: string): Promise<OAuthClientRecord | null> {
    const client = [...this.clients.values()].find(
      (item) => item.clientId === clientId,
    );

    return client ? { ...client } : null;
  }

  async findByIds(ids: string[]): Promise<OAuthClientRecord[]> {
    return ids.flatMap((id) => {
      const client = this.clients.get(id);

      return client ? [{ ...client }] : [];
    });
  }

  async countBySource(source: 'dcr' | 'cimd'): Promise<number> {
    return [...this.clients.values()].filter((item) => item.source === source)
      .length;
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    const client = this.clients.get(id);

    if (client) {
      this.clients.set(id, { ...client, lastUsedAt: at });
    }
  }

  /** Os testes de limpeza informam quais clientes têm grants. */
  clientsWithGrants = new Set<string>();

  async deleteUnusedDcr(olderThan: Date): Promise<number> {
    let removed = 0;

    for (const client of [...this.clients.values()]) {
      if (
        client.source === 'dcr' &&
        client.createdAt < olderThan &&
        !this.clientsWithGrants.has(client.id)
      ) {
        this.clients.delete(client.id);
        removed += 1;
      }
    }

    return removed;
  }
}

export class InMemoryOAuthGrantRepository implements OAuthGrantRepository {
  readonly grants = new Map<string, OAuthGrantRecord>();

  async activate(input: {
    userId: string;
    clientRef: string;
    scope: string;
    resource: string;
  }): Promise<OAuthGrantRecord> {
    const existing = [...this.grants.values()].find(
      (grant) =>
        grant.userId === input.userId &&
        grant.clientRef === input.clientRef &&
        !grant.revokedAt,
    );

    if (existing) {
      const updated = {
        ...existing,
        scope: input.scope,
        resource: input.resource,
      };

      this.grants.set(updated.id, updated);

      return { ...updated };
    }

    const grant: OAuthGrantRecord = {
      id: randomUUID(),
      ...input,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
    };

    this.grants.set(grant.id, grant);

    return { ...grant };
  }

  async findById(id: string): Promise<OAuthGrantRecord | null> {
    const grant = this.grants.get(id);

    return grant ? { ...grant } : null;
  }

  async listActiveByUser(userId: string): Promise<OAuthGrantRecord[]> {
    return [...this.grants.values()]
      .filter((grant) => grant.userId === userId && !grant.revokedAt)
      .map((grant) => ({ ...grant }));
  }

  async revokeForUser(id: string, userId: string, at: Date): Promise<boolean> {
    const grant = this.grants.get(id);

    if (!grant || grant.userId !== userId || grant.revokedAt) {
      return false;
    }

    this.grants.set(id, { ...grant, revokedAt: at });

    return true;
  }

  async revoke(id: string, at: Date): Promise<void> {
    const grant = this.grants.get(id);

    if (grant && !grant.revokedAt) {
      this.grants.set(id, { ...grant, revokedAt: at });
    }
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    const grant = this.grants.get(id);

    if (grant) {
      this.grants.set(id, { ...grant, lastUsedAt: at });
    }
  }
}

export class InMemoryOAuthCodeRepository implements OAuthCodeRepository {
  readonly codes = new Map<string, OAuthCodeRecord>();

  async create(code: OAuthCodeRecord): Promise<void> {
    this.codes.set(code.id, { ...code });
  }

  async findByHash(codeHash: string): Promise<OAuthCodeRecord | null> {
    const code = [...this.codes.values()].find(
      (item) => item.codeHash === codeHash,
    );

    return code ? { ...code } : null;
  }

  async markUsed(id: string, at: Date): Promise<boolean> {
    const code = this.codes.get(id);

    if (!code || code.usedAt) {
      return false;
    }

    this.codes.set(id, { ...code, usedAt: at });

    return true;
  }

  async deleteExpiredBefore(before: Date): Promise<number> {
    let removed = 0;

    for (const code of [...this.codes.values()]) {
      if (code.expiresAt < before) {
        this.codes.delete(code.id);
        removed += 1;
      }
    }

    return removed;
  }
}

export class InMemoryOAuthTokenRepository implements OAuthTokenRepository {
  readonly accessTokens = new Map<string, OAuthAccessTokenRecord>();
  readonly refreshTokens = new Map<string, OAuthRefreshTokenRecord>();

  async createAccessToken(token: OAuthAccessTokenRecord): Promise<void> {
    this.accessTokens.set(token.id, { ...token });
  }

  async findAccessTokenByHash(
    tokenHash: string,
  ): Promise<OAuthAccessTokenRecord | null> {
    const token = [...this.accessTokens.values()].find(
      (item) => item.tokenHash === tokenHash,
    );

    return token ? { ...token } : null;
  }

  async deleteAccessTokenByHash(tokenHash: string): Promise<void> {
    for (const token of [...this.accessTokens.values()]) {
      if (token.tokenHash === tokenHash) {
        this.accessTokens.delete(token.id);
      }
    }
  }

  async createRefreshToken(token: OAuthRefreshTokenRecord): Promise<void> {
    this.refreshTokens.set(token.id, { ...token });
  }

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<OAuthRefreshTokenRecord | null> {
    const token = [...this.refreshTokens.values()].find(
      (item) => item.tokenHash === tokenHash,
    );

    return token ? { ...token } : null;
  }

  async rotateRefreshToken(
    id: string,
    replacedBy: string,
    at: Date,
  ): Promise<void> {
    const token = this.refreshTokens.get(id);

    if (token && !token.revokedAt) {
      this.refreshTokens.set(id, { ...token, revokedAt: at, replacedBy });
    }
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    for (const token of [...this.refreshTokens.values()]) {
      if (token.familyId === familyId && !token.revokedAt) {
        this.refreshTokens.set(token.id, { ...token, revokedAt: at });
      }
    }
  }

  async revokeAllForGrant(grantId: string, at: Date): Promise<void> {
    for (const token of [...this.refreshTokens.values()]) {
      if (token.grantId === grantId && !token.revokedAt) {
        this.refreshTokens.set(token.id, { ...token, revokedAt: at });
      }
    }

    for (const token of [...this.accessTokens.values()]) {
      if (token.grantId === grantId) {
        this.accessTokens.delete(token.id);
      }
    }
  }

  async deleteExpiredAccessTokens(before: Date): Promise<number> {
    let removed = 0;

    for (const token of [...this.accessTokens.values()]) {
      if (token.expiresAt < before) {
        this.accessTokens.delete(token.id);
        removed += 1;
      }
    }

    return removed;
  }

  async deleteStaleRefreshTokens(
    expiredBefore: Date,
    revokedBefore: Date,
  ): Promise<number> {
    let removed = 0;

    for (const token of [...this.refreshTokens.values()]) {
      if (
        token.expiresAt < expiredBefore ||
        (token.revokedAt !== null && token.revokedAt < revokedBefore)
      ) {
        this.refreshTokens.delete(token.id);
        removed += 1;
      }
    }

    return removed;
  }
}
