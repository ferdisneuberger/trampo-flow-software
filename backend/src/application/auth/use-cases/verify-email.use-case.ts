import { Injectable, Logger } from '@nestjs/common';
import { AuthTokenRepository } from '../../../domain/auth/repositories/auth-token.repository';
import { Mailer } from '../../../domain/auth/services/mailer';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { DomainError } from '../../../domain/shared/errors/domain.error';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { buildVerifiedEmail } from '../emails/verified-email';
import { AuthSettings } from '../services/auth-settings';
import { sendMailInBackground } from '../services/send-mail-in-background';
import { normalizeVerificationCode } from '../services/verification-code';

export type VerifyEmailInput = {
  token: string;
};

@Injectable()
export class VerifyEmailUseCase {
  private readonly logger = new Logger(VerifyEmailUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly tokenHasher: TokenHasher,
    private readonly mailer: Mailer,
    private readonly settings: AuthSettings,
  ) {}

  async execute(input: VerifyEmailInput): Promise<void> {
    const code = normalizeVerificationCode(input.token);

    if (!code) {
      throw invalidToken();
    }

    const token = await this.authTokenRepository.findByHash(
      this.tokenHasher.hash(code),
    );

    if (!token || token.type !== 'EMAIL_VERIFICATION') {
      throw invalidToken();
    }

    const user = await this.userRepository.findById(token.userId);

    if (!user) {
      throw invalidToken();
    }

    if (token.isUsed()) {
      if (user.isEmailVerified) {
        return;
      }

      throw invalidToken();
    }

    const now = new Date();

    if (token.isExpired(now)) {
      throw invalidToken();
    }

    if (user.isEmailVerified) {
      await this.authTokenRepository.markUsed(token.id, now);

      return;
    }

    user.markEmailVerified(now);
    await this.userRepository.update(user);
    await this.authTokenRepository.markUsed(token.id, now);

    const emailMessage = buildVerifiedEmail({
      appBaseUrl: this.settings.appBaseUrl,
    });

    sendMailInBackground(
      this.mailer,
      {
        to: user.email ?? '',
        ...emailMessage,
      },
      this.logger,
      'Falha ao enviar confirmação de verificação',
    );
  }
}

function invalidToken(): DomainError {
  return new DomainError(
    'Código inválido, expirado ou já utilizado.',
    'INVALID_VERIFICATION_TOKEN',
  );
}
