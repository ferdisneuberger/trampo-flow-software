import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../shared/errors/forbidden.error';
import { AuthTokenRepository } from '../../../domain/auth/repositories/auth-token.repository';
import { RefreshTokenRepository } from '../../../domain/auth/repositories/refresh-token.repository';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { DomainError } from '../../../domain/shared/errors/domain.error';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../../domain/users/services/password-hasher';
import { assertPasswordPolicy } from '../../../domain/users/services/password-policy';

export type ResetPasswordInput = {
  token: string;
  password: string;
};

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenHasher: TokenHasher,
  ) {}

  async execute({ token, password }: ResetPasswordInput): Promise<void> {
    const normalized = token.trim();

    if (normalized.length === 0 || normalized.length > 512) {
      throw invalidToken();
    }

    const stored = await this.authTokenRepository.findByHash(
      this.tokenHasher.hash(normalized),
    );

    if (!stored || stored.type !== 'PASSWORD_RESET') {
      throw invalidToken();
    }

    const user = await this.userRepository.findById(stored.userId);
    const now = new Date();

    if (!user || stored.isUsed() || stored.isExpired(now)) {
      throw invalidToken();
    }

    if (!user.passwordHash) {
      throw new ForbiddenError(
        'Esta conta não usa senha para entrar.',
        'PASSWORD_LOGIN_UNAVAILABLE',
      );
    }

    assertPasswordPolicy(password);

    const passwordHash = await this.passwordHasher.hash(password);

    user.changePassword(passwordHash, now);
    await this.userRepository.update(user);
    await this.authTokenRepository.markUsed(stored.id, now);
    await this.refreshTokenRepository.revokeAllForUser(user.id);
  }
}

function invalidToken(): DomainError {
  return new DomainError(
    'Link inválido, expirado ou já utilizado.',
    'INVALID_RESET_TOKEN',
  );
}
