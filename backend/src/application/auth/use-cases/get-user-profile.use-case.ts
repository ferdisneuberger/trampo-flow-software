import { Injectable } from '@nestjs/common';
import { AuthTokenRepository } from '../../../domain/auth/repositories/auth-token.repository';
import { User } from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';
import { AuthSettings } from '../services/auth-settings';

export type UserProfile = {
  user: User;
  verificationResendAvailableAt: Date | null;
};

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly settings: AuthSettings,
  ) {}

  async execute(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('Token inválido ou expirado.');
    }

    if (user.isEmailVerified) {
      return { user, verificationResendAvailableAt: null };
    }

    const latestToken = await this.authTokenRepository.findLatestByUserAndType(
      user.id,
      'EMAIL_VERIFICATION',
    );

    return {
      user,
      verificationResendAvailableAt: latestToken
        ? new Date(
            latestToken.createdAt.getTime() + this.settings.resendCooldownMs,
          )
        : null,
    };
  }
}
