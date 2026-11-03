import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../shared/errors/forbidden.error';
import { ConflictError } from '../../shared/errors/conflict.error';
import { GoogleIdentityVerifier } from '../../../domain/auth/services/google-identity-verifier';
import { DomainError } from '../../../domain/shared/errors/domain.error';
import {
  normalizeEmail,
  User,
} from '../../../domain/users/entities/user.entity';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { AuthSettings } from '../services/auth-settings';

export type GoogleSignInInput = {
  credential: string;
  termsAccepted?: boolean;
};

export type GoogleSignInResult = {
  user: User;
  isNew: boolean;
};

@Injectable()
export class GoogleSignInUseCase {
  constructor(
    private readonly verifier: GoogleIdentityVerifier,
    private readonly userRepository: UserRepository,
    private readonly settings: AuthSettings,
  ) {}

  async execute(input: GoogleSignInInput): Promise<GoogleSignInResult> {
    const identity = await this.verifier.verify(input.credential);

    if (!identity.emailVerified) {
      throw new DomainError(
        'O Google não confirmou este e-mail.',
        'GOOGLE_EMAIL_UNVERIFIED',
      );
    }

    const email = normalizeEmail(identity.email);
    const now = new Date();
    const byGoogleId = await this.userRepository.findByGoogleId(
      identity.googleId,
    );

    if (byGoogleId) {
      byGoogleId.registerLogin(now);
      await this.userRepository.update(byGoogleId);

      return { user: byGoogleId, isNew: false };
    }

    const byEmail = await this.userRepository.findByEmail(email);

    if (byEmail) {
      if (!byEmail.isEmailVerified) {
        throw new ConflictError(
          'Confirme seu e-mail antes de vincular a conta Google.',
          'GOOGLE_ACCOUNT_CONFLICT',
        );
      }

      byEmail.linkGoogleAccount(identity.googleId, now);
      byEmail.registerLogin(now);
      await this.userRepository.update(byEmail);

      return { user: byEmail, isNew: false };
    }

    if (!input.termsAccepted) {
      throw new ForbiddenError(
        'É necessário aceitar os termos de uso para criar a conta.',
        'TERMS_REQUIRED',
      );
    }

    const user = User.create({
      email,
      googleId: identity.googleId,
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      termsVersion: this.settings.termsVersion,
    });

    user.registerLogin(now);
    await this.userRepository.create(user);

    return { user, isNew: true };
  }
}
