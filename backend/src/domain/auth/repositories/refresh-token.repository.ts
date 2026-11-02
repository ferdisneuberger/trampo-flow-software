export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type CreateRefreshTokenInput = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent: string | null;
};

export abstract class RefreshTokenRepository {
  abstract create(input: CreateRefreshTokenInput): Promise<void>;

  abstract findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;

  abstract revoke(id: string, replacedBy: string | null): Promise<void>;

  abstract revokeFamily(familyId: string): Promise<void>;

  abstract deleteExpired(before: Date): Promise<void>;
}
