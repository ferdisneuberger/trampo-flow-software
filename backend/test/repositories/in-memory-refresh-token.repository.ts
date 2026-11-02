import {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../src/domain/auth/repositories/refresh-token.repository';

function clone(record: RefreshTokenRecord): RefreshTokenRecord {
  return {
    ...record,
    expiresAt: new Date(record.expiresAt),
    revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
    createdAt: new Date(record.createdAt),
  };
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Map<string, RefreshTokenRecord>();

  async create(input: CreateRefreshTokenInput): Promise<void> {
    this.tokens.set(input.id, {
      ...input,
      revokedAt: null,
      replacedBy: null,
      createdAt: new Date(),
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = [...this.tokens.values()].find(
      (candidate) => candidate.tokenHash === tokenHash,
    );

    return record ? clone(record) : null;
  }

  async revoke(id: string, replacedBy: string | null): Promise<void> {
    const record = this.tokens.get(id);

    if (!record || record.revokedAt) {
      return;
    }

    record.revokedAt = new Date();
    record.replacedBy = replacedBy;
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const record of this.tokens.values()) {
      if (record.familyId === familyId && !record.revokedAt) {
        record.revokedAt = new Date();
      }
    }
  }

  async deleteExpired(before: Date): Promise<void> {
    for (const [id, record] of this.tokens.entries()) {
      if (record.expiresAt.getTime() < before.getTime()) {
        this.tokens.delete(id);
      }
    }
  }

  findAll(): RefreshTokenRecord[] {
    return [...this.tokens.values()].map(clone);
  }

  markExpiredAt(id: string, expiresAt: Date): void {
    const record = this.tokens.get(id);

    if (record) {
      record.expiresAt = new Date(expiresAt);
    }
  }

  markRevokedAt(
    id: string,
    revokedAt: Date,
    replacedBy: string | null = null,
  ): void {
    const record = this.tokens.get(id);

    if (record) {
      record.revokedAt = new Date(revokedAt);
      record.replacedBy = replacedBy;
    }
  }

  get count(): number {
    return this.tokens.size;
  }
}
