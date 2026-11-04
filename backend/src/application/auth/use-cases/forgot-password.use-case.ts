import { Injectable, Logger } from '@nestjs/common';
import { AuthToken } from '../../../domain/auth/entities/auth-token.entity';
import { AuthTokenRepository } from '../../../domain/auth/repositories/auth-token.repository';
import { Mailer } from '../../../domain/auth/services/mailer';
import { PasswordResetTokenGenerator } from '../../../domain/auth/services/password-reset-token-generator';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { normalizeEmail } from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { buildPasswordResetEmail } from '../emails/password-reset-email';
import { AuthSettings } from '../services/auth-settings';
import { sendMailInBackground } from '../services/send-mail-in-background';

export type ForgotPasswordInput = {
  email: string;
};

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly tokenGenerator: PasswordResetTokenGenerator,
    private readonly tokenHasher: TokenHasher,
    private readonly mailer: Mailer,
    private readonly settings: AuthSettings,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    let email: string;

    try {
      email = normalizeEmail(input.email);
    } catch {
      return;
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      return;
    }

    const now = new Date();

    await this.authTokenRepository.deleteByUserAndType(
      user.id,
      'PASSWORD_RESET',
    );

    const token = this.tokenGenerator.generate();
    const authToken = AuthToken.create({
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash: this.tokenHasher.hash(token),
      expiresAt: new Date(now.getTime() + this.settings.passwordResetTtlMs),
    });

    await this.authTokenRepository.create(authToken);

    const message = buildPasswordResetEmail({
      token,
      appBaseUrl: this.settings.appBaseUrl,
      expiresInMinutes: Math.max(
        1,
        Math.round(this.settings.passwordResetTtlMs / (60 * 1000)),
      ),
    });

    sendMailInBackground(
      this.mailer,
      { to: email, ...message },
      this.logger,
      'Falha ao enviar recuperação de senha',
    );
  }
}
