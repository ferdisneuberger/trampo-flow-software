import { Injectable } from '@nestjs/common';
import { PersonalAccessTokenRepository } from '../../../domain/auth/repositories/personal-access-token.repository';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

/** Intervalo mínimo entre gravações de `lastUsedAt`, para não escrever a cada requisição. */
export const LAST_USED_THROTTLE_MS = 60 * 1000;

export type AuthenticatedPersonalAccessToken = {
  userId: string;
  tokenId: string;
};

@Injectable()
export class AuthenticatePersonalAccessTokenUseCase {
  constructor(
    private readonly repository: PersonalAccessTokenRepository,
    private readonly hasher: TokenHasher,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(secret: string): Promise<AuthenticatedPersonalAccessToken> {
    const token = await this.repository.findByHash(this.hasher.hash(secret));
    const now = new Date();

    if (!token || !token.isActive(now)) {
      throw new UnauthorizedError(
        'Token de integração inválido, expirado ou revogado.',
        'INVALID_PERSONAL_ACCESS_TOKEN',
      );
    }

    if (!(await this.userRepository.existsById(token.userId))) {
      throw new UnauthorizedError(
        'Token de integração inválido, expirado ou revogado.',
        'INVALID_PERSONAL_ACCESS_TOKEN',
      );
    }

    const lastUsedAt = token.lastUsedAt;

    if (
      !lastUsedAt ||
      now.getTime() - lastUsedAt.getTime() >= LAST_USED_THROTTLE_MS
    ) {
      await this.repository.touchLastUsed(token.id, now);
    }

    return { userId: token.userId, tokenId: token.id };
  }
}
