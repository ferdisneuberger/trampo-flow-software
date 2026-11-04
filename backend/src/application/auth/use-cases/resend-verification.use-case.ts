import { Injectable, Logger } from '@nestjs/common';
import { AuthToken } from '../../../domain/auth/entities/auth-token.entity';
import { AuthTokenRepository } from '../../../domain/auth/repositories/auth-token.repository';
import { Mailer } from '../../../domain/auth/services/mailer';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { VerificationCodeGenerator } from '../../../domain/auth/services/verification-code-generator';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';
import { buildVerificationEmail } from '../emails/verification-email';
import { AuthSettings } from '../services/auth-settings';
import { sendMailInBackground } from '../services/send-mail-in-background';

export type ResendVerificationResult = {
  sent: boolean;
  retryAfterSeconds: number;
};

@Injectable()
export class ResendVerificationUseCase {
  private readonly logger = new Logger(ResendVerificationUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly codeGenerator: VerificationCodeGenerator,
    private readonly tokenHasher: TokenHasher,
    private readonly mailer: Mailer,
    private readonly settings: AuthSettings,
  ) {}

  async execute(userId: string): Promise<ResendVerificationResult> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('Token inválido ou expirado.');
    }

    if (user.isEmailVerified) {
      return { sent: false, retryAfterSeconds: 0 };
    }

    const now = new Date();
    const latestToken = await this.authTokenRepository.findLatestByUserAndType(
      user.id,
      'EMAIL_VERIFICATION',
    );

    if (latestToken) {
      const elapsed = now.getTime() - latestToken.createdAt.getTime();

      if (elapsed < this.settings.resendCooldownMs) {
        return {
          sent: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((this.settings.resendCooldownMs - elapsed) / 1000),
          ),
        };
      }
    }

    await this.authTokenRepository.deleteByUserAndType(
      user.id,
      'EMAIL_VERIFICATION',
    );

    const code = this.codeGenerator.generate();
    const token = AuthToken.create({
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      tokenHash: this.tokenHasher.hash(code),
      expiresAt: new Date(now.getTime() + this.settings.verificationTtlMs),
    });

    await this.authTokenRepository.create(token);

    user.markVerificationSent(now);
    await this.userRepository.update(user);

    const message = buildVerificationEmail({
      code,
      appBaseUrl: this.settings.appBaseUrl,
      expiresInHours: Math.max(
        1,
        Math.round(this.settings.verificationTtlMs / (60 * 60 * 1000)),
      ),
    });

    sendMailInBackground(
      this.mailer,
      { to: user.email ?? '', ...message },
      this.logger,
      'Falha ao reenviar verificação',
    );

    return {
      sent: true,
      retryAfterSeconds: Math.ceil(this.settings.resendCooldownMs / 1000),
    };
  }
}
