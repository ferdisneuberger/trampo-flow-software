import { PersonalAccessToken } from '../../src/domain/auth/entities/personal-access-token.entity';
import { PersonalAccessTokenRepository } from '../../src/domain/auth/repositories/personal-access-token.repository';

function clone(
  token: PersonalAccessToken,
  overrides: Partial<{ lastUsedAt: Date | null; revokedAt: Date | null }> = {},
): PersonalAccessToken {
  return PersonalAccessToken.restore({
    id: token.id,
    userId: token.userId,
    name: token.name,
    tokenHash: token.tokenHash,
    prefix: token.prefix,
    lastUsedAt: token.lastUsedAt,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    createdAt: token.createdAt,
    ...overrides,
  });
}

export class InMemoryPersonalAccessTokenRepository implements PersonalAccessTokenRepository {
  readonly tokens = new Map<string, PersonalAccessToken>();
  touchCalls = 0;

  async create(token: PersonalAccessToken): Promise<void> {
    this.tokens.set(token.id, clone(token));
  }

  async findByHash(tokenHash: string): Promise<PersonalAccessToken | null> {
    const token = [...this.tokens.values()].find(
      (candidate) => candidate.tokenHash === tokenHash,
    );

    return token ? clone(token) : null;
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<PersonalAccessToken | null> {
    const token = this.tokens.get(id);

    return token && token.userId === userId ? clone(token) : null;
  }

  async listByUser(userId: string): Promise<PersonalAccessToken[]> {
    return [...this.tokens.values()]
      .filter((token) => token.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((token) => clone(token));
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    const token = this.tokens.get(id);

    if (token && !token.isRevoked()) {
      this.tokens.set(id, clone(token, { revokedAt }));
    }
  }

  async touchLastUsed(id: string, usedAt: Date): Promise<void> {
    const token = this.tokens.get(id);

    if (!token) {
      throw new Error(`PersonalAccessToken "${id}" does not exist.`);
    }

    this.touchCalls += 1;
    this.tokens.set(id, clone(token, { lastUsedAt: usedAt }));
  }

  /** Ajuda os testes a simular tokens antigos. */
  set(token: PersonalAccessToken): void {
    this.tokens.set(token.id, token);
  }
}
