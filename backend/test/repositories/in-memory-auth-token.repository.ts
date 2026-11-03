import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import type { AuthTokenType } from '../../src/domain/auth/enums/auth-token-type.enum';
import { AuthTokenRepository } from '../../src/domain/auth/repositories/auth-token.repository';

function clone(token: AuthToken): AuthToken {
  return AuthToken.restore({
    id: token.id,
    userId: token.userId,
    type: token.type,
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: token.usedAt,
    createdAt: token.createdAt,
  });
}

export class InMemoryAuthTokenRepository implements AuthTokenRepository {
  private readonly tokens = new Map<string, AuthToken>();

  async create(token: AuthToken): Promise<void> {
    if (this.tokens.has(token.id)) {
      throw new Error(`AuthToken "${token.id}" already exists.`);
    }

    this.tokens.set(token.id, clone(token));
  }

  async findByHash(tokenHash: string): Promise<AuthToken | null> {
    const token = [...this.tokens.values()].find(
      (candidate) => candidate.tokenHash === tokenHash,
    );

    return token ? clone(token) : null;
  }

  async findLatestByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<AuthToken | null> {
    const token = [...this.tokens.values()]
      .filter(
        (candidate) => candidate.userId === userId && candidate.type === type,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return token ? clone(token) : null;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    const token = this.tokens.get(id);

    if (!token) {
      throw new Error(`AuthToken "${id}" does not exist.`);
    }

    this.tokens.set(
      id,
      AuthToken.restore({
        id: token.id,
        userId: token.userId,
        type: token.type,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        usedAt,
        createdAt: token.createdAt,
      }),
    );
  }

  async deleteByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<void> {
    for (const [id, token] of this.tokens) {
      if (token.userId === userId && token.type === type) {
        this.tokens.delete(id);
      }
    }
  }
}
