import { Injectable, Logger } from '@nestjs/common';
import { ConflictError } from '../../shared/errors/conflict.error';
import { ForbiddenError } from '../../shared/errors/forbidden.error';
import { AuthToken } from '../../../domain/auth/entities/auth-token.entity';
import { AuthTokenRepository } from '../../../domain/auth/repositories/auth-token.repository';
import { Mailer } from '../../../domain/auth/services/mailer';
import { TokenHasher } from '../../../domain/auth/services/token-hasher';
import { VerificationCodeGenerator } from '../../../domain/auth/services/verification-code-generator';
import {
  normalizeEmail,
  User,
} from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../../domain/users/services/password-hasher';
import { assertPasswordPolicy } from '../../../domain/users/services/password-policy';
import { DomainError } from '../../../domain/shared/errors/domain.error';
import { buildVerificationEmail } from '../emails/verification-email';
import { AuthSettings } from '../services/auth-settings';

export type RegisterUserInput = {
  email: string;
  password: string;
  termsAccepted: boolean;
};

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly codeGenerator: VerificationCodeGenerator,
    private readonly tokenHasher: TokenHasher,
    private readonly mailer: Mailer,
    private readonly settings: AuthSettings,
  ) {}

  async execute(input: RegisterUserInput): Promise<void> {
    if (!this.settings.registrationEnabled) {
      throw new ForbiddenError(
        'O cadastro está temporariamente desabilitado.',
        'REGISTRATION_DISABLED',
      );
    }

    if (!input.termsAccepted) {
      throw new DomainError(
        'É necessário aceitar os termos de uso.',
        'TERMS_NOT_ACCEPTED',
      );
    }

    const email = normalizeEmail(input.email);

    assertPasswordPolicy(input.password);

    if (await this.userRepository.findByEmail(email)) {
      throw new ConflictError(
        'E-mail já cadastrado.',
        'EMAIL_ALREADY_REGISTERED',
      );
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const now = new Date();
    const user = User.create({
      email,
      passwordHash,
      termsAcceptedAt: now,
      termsVersion: this.settings.termsVersion,
    });

    try {
      await this.userRepository.create(user);
    } catch (error) {
      if (await this.userRepository.findByEmail(email)) {
        throw new ConflictError(
          'E-mail já cadastrado.',
          'EMAIL_ALREADY_REGISTERED',
        );
      }

      throw error;
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

    const emailMessage = buildVerificationEmail({
      code,
      appBaseUrl: this.settings.appBaseUrl,
      expiresInHours: Math.max(
        1,
        Math.round(this.settings.verificationTtlMs / (60 * 60 * 1000)),
      ),
    });

    try {
      await this.mailer.send({
        to: email,
        ...emailMessage,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar verificação para ${email}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
    }
  }
}
