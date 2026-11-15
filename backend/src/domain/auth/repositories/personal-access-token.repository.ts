import type { PersonalAccessToken } from '../entities/personal-access-token.entity';

export abstract class PersonalAccessTokenRepository {
  abstract create(token: PersonalAccessToken): Promise<void>;

  abstract findByHash(tokenHash: string): Promise<PersonalAccessToken | null>;

  abstract findById(
    id: string,
    userId: string,
  ): Promise<PersonalAccessToken | null>;

  /** Tokens do usuário, mais recentes primeiro (inclui revogados e expirados). */
  abstract listByUser(userId: string): Promise<PersonalAccessToken[]>;

  abstract revoke(id: string, revokedAt: Date): Promise<void>;

  abstract touchLastUsed(id: string, usedAt: Date): Promise<void>;
}
