import type { AuthToken } from '../entities/auth-token.entity';
import type { AuthTokenType } from '../enums/auth-token-type.enum';

export abstract class AuthTokenRepository {
  abstract create(token: AuthToken): Promise<void>;

  abstract findByHash(tokenHash: string): Promise<AuthToken | null>;

  abstract findLatestByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<AuthToken | null>;

  abstract markUsed(id: string, usedAt: Date): Promise<void>;

  abstract deleteByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<void>;
}
