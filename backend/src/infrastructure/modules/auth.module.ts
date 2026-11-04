import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticateUserUseCase } from '../../application/auth/use-cases/authenticate-user.use-case';
import { CreateSessionUseCase } from '../../application/auth/use-cases/create-session.use-case';
import { DeleteUserByEmailUseCase } from '../../application/auth/use-cases/delete-user-by-email.use-case';
import { ForgotPasswordUseCase } from '../../application/auth/use-cases/forgot-password.use-case';
import { GetUserProfileUseCase } from '../../application/auth/use-cases/get-user-profile.use-case';
import { GoogleSignInUseCase } from '../../application/auth/use-cases/google-sign-in.use-case';
import { LogoutUseCase } from '../../application/auth/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../application/auth/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../../application/auth/use-cases/register-user.use-case';
import { ResendVerificationUseCase } from '../../application/auth/use-cases/resend-verification.use-case';
import { ResetPasswordUseCase } from '../../application/auth/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from '../../application/auth/use-cases/verify-email.use-case';
import { AuthSettings } from '../../application/auth/services/auth-settings';
import { AuthTokenRepository } from '../../domain/auth/repositories/auth-token.repository';
import { GoogleIdentityVerifier } from '../../domain/auth/services/google-identity-verifier';
import { Mailer } from '../../domain/auth/services/mailer';
import { TokenHasher } from '../../domain/auth/services/token-hasher';
import { PasswordResetTokenGenerator } from '../../domain/auth/services/password-reset-token-generator';
import { VerificationCodeGenerator } from '../../domain/auth/services/verification-code-generator';
import { RefreshTokenRepository } from '../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenGenerator } from '../../domain/auth/services/refresh-token-generator';
import { RefreshTokenPolicy } from '../../domain/auth/services/refresh-token-policy';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../domain/users/services/password-hasher';
import { CryptoRefreshTokenGenerator } from '../auth/crypto-refresh-token-generator';
import { CryptoPasswordResetTokenGenerator } from '../auth/crypto-password-reset-token-generator';
import { GoogleTokenVerifier } from '../auth/google-token-verifier';
import { CryptoVerificationCodeGenerator } from '../auth/crypto-verification-code-generator';
import { HmacTokenHasher } from '../auth/hmac-token-hasher';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../auth/login-rate-limiter.service';
import { RateLimiterService } from '../auth/rate-limiter.service';
import { ScryptPasswordHasher } from '../auth/scrypt-password-hasher';
import { TokenService } from '../auth/token.service';
import { PrismaAuthTokenRepository } from '../database/prisma/repositories/prisma-auth-token.repository';
import { PrismaRefreshTokenRepository } from '../database/prisma/repositories/prisma-refresh-token.repository';
import { PrismaUserRepository } from '../database/prisma/repositories/prisma-user.repository';
import { AdminUsersController } from '../http/controllers/admin-users.controller';
import { AuthController } from '../http/controllers/auth.controller';
import { SmtpMailer } from '../mail/smtp-mailer';

const HOUR_IN_MS = 60 * 60 * 1000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  controllers: [AuthController, AdminUsersController],
  providers: [
    AuthenticateUserUseCase,
    CreateSessionUseCase,
    GetUserProfileUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    RegisterUserUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    GoogleSignInUseCase,
    DeleteUserByEmailUseCase,
    LoginRateLimiter,
    RateLimiterService,
    ScryptPasswordHasher,
    TokenService,
    CryptoRefreshTokenGenerator,
    CryptoVerificationCodeGenerator,
    CryptoPasswordResetTokenGenerator,
    GoogleTokenVerifier,
    HmacTokenHasher,
    SmtpMailer,
    {
      provide: PasswordHasher,
      useExisting: ScryptPasswordHasher,
    },
    {
      provide: RefreshTokenGenerator,
      useExisting: CryptoRefreshTokenGenerator,
    },
    {
      provide: VerificationCodeGenerator,
      useExisting: CryptoVerificationCodeGenerator,
    },
    {
      provide: TokenHasher,
      useExisting: HmacTokenHasher,
    },
    {
      provide: PasswordResetTokenGenerator,
      useExisting: CryptoPasswordResetTokenGenerator,
    },
    {
      provide: GoogleIdentityVerifier,
      useExisting: GoogleTokenVerifier,
    },
    {
      provide: Mailer,
      useExisting: SmtpMailer,
    },
    {
      provide: AuthSettings,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new AuthSettings(
          configService.get<string>('REGISTRATION_ENABLED') === 'true',
          readPositiveInt(
            configService.get<string>('EMAIL_VERIFICATION_TTL_HOURS'),
            12,
          ) *
            60 *
            60 *
            1000,
          readPositiveInt(
            configService.get<string>('VERIFICATION_RESEND_SECONDS'),
            120,
          ) * 1000,
          readPositiveInt(
            configService.get<string>('PASSWORD_RESET_TTL_MINUTES'),
            15,
          ) *
            60 *
            1000,
          configService.get<string>('TERMS_VERSION')?.trim() || '2026-11',
          (
            configService.get<string>('APP_BASE_URL')?.trim() ||
            'http://localhost:5173'
          ).replace(/\/+$/, ''),
        ),
    },
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: AuthTokenRepository,
      useClass: PrismaAuthTokenRepository,
    },
    {
      provide: RefreshTokenRepository,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: RefreshTokenPolicy,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new RefreshTokenPolicy(
          readPositiveInt(
            configService.get<string>('REFRESH_TOKEN_TTL_HOURS'),
            12,
          ) * HOUR_IN_MS,
          readPositiveInt(
            configService.get<string>('REFRESH_TOKEN_GRACE_SECONDS'),
            10,
          ) * 1000,
        ),
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
