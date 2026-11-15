import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticatePersonalAccessTokenUseCase } from '../../application/auth/use-cases/authenticate-personal-access-token.use-case';
import { CreatePersonalAccessTokenUseCase } from '../../application/auth/use-cases/create-personal-access-token.use-case';
import { ListPersonalAccessTokensUseCase } from '../../application/auth/use-cases/list-personal-access-tokens.use-case';
import { RevokePersonalAccessTokenUseCase } from '../../application/auth/use-cases/revoke-personal-access-token.use-case';
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
import { UpdateThemePreferenceUseCase } from '../../application/auth/use-cases/update-theme-preference.use-case';
import { VerifyEmailUseCase } from '../../application/auth/use-cases/verify-email.use-case';
import { AuthSettings } from '../../application/auth/services/auth-settings';
import { AuthTokenRepository } from '../../domain/auth/repositories/auth-token.repository';
import { GoogleIdentityVerifier } from '../../domain/auth/services/google-identity-verifier';
import { Mailer } from '../../domain/auth/services/mailer';
import { TokenHasher } from '../../domain/auth/services/token-hasher';
import { PasswordResetTokenGenerator } from '../../domain/auth/services/password-reset-token-generator';
import { VerificationCodeGenerator } from '../../domain/auth/services/verification-code-generator';
import { PersonalAccessTokenRepository } from '../../domain/auth/repositories/personal-access-token.repository';
import { PersonalAccessTokenGenerator } from '../../domain/auth/services/personal-access-token-generator';
import { RefreshTokenRepository } from '../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenGenerator } from '../../domain/auth/services/refresh-token-generator';
import { RefreshTokenPolicy } from '../../domain/auth/services/refresh-token-policy';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../domain/users/services/password-hasher';
import { CryptoPersonalAccessTokenGenerator } from '../auth/crypto-personal-access-token-generator';
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
import { PrismaPersonalAccessTokenRepository } from '../database/prisma/repositories/prisma-personal-access-token.repository';
import { PrismaRefreshTokenRepository } from '../database/prisma/repositories/prisma-refresh-token.repository';
import { PrismaUserRepository } from '../database/prisma/repositories/prisma-user.repository';
import { AdminUsersController } from '../http/controllers/admin-users.controller';
import { AuthController } from '../http/controllers/auth.controller';
import { PersonalAccessTokensController } from '../http/controllers/personal-access-tokens.controller';
import { SmtpMailer } from '../mail/smtp-mailer';
import { AuthorizationRequestValidator } from '../../application/oauth/services/authorization-request';
import { OAuthSettings } from '../../application/oauth/services/oauth-settings';
import { OAuthTokenIssuer } from '../../application/oauth/services/oauth-token-issuer';
import { AuthenticateOAuthAccessTokenUseCase } from '../../application/oauth/use-cases/authenticate-oauth-access-token.use-case';
import { DecideAuthorizationUseCase } from '../../application/oauth/use-cases/decide-authorization.use-case';
import { ExchangeAuthorizationCodeUseCase } from '../../application/oauth/use-cases/exchange-authorization-code.use-case';
import { GetAuthorizationServerMetadataUseCase } from '../../application/oauth/use-cases/get-authorization-server-metadata.use-case';
import { ListOAuthGrantsUseCase } from '../../application/oauth/use-cases/list-oauth-grants.use-case';
import { PreviewAuthorizationUseCase } from '../../application/oauth/use-cases/preview-authorization.use-case';
import { RefreshOAuthTokenUseCase } from '../../application/oauth/use-cases/refresh-oauth-token.use-case';
import { RegisterOAuthClientUseCase } from '../../application/oauth/use-cases/register-oauth-client.use-case';
import { ResolveOAuthClientUseCase } from '../../application/oauth/use-cases/resolve-oauth-client.use-case';
import { RevokeOAuthGrantUseCase } from '../../application/oauth/use-cases/revoke-oauth-grant.use-case';
import { RevokeOAuthTokenUseCase } from '../../application/oauth/use-cases/revoke-oauth-token.use-case';
import { OAuthClientRepository } from '../../domain/oauth/repositories/oauth-client.repository';
import { OAuthCodeRepository } from '../../domain/oauth/repositories/oauth-code.repository';
import { OAuthGrantRepository } from '../../domain/oauth/repositories/oauth-grant.repository';
import { OAuthTokenRepository } from '../../domain/oauth/repositories/oauth-token.repository';
import { ClientMetadataFetcher } from '../../domain/oauth/services/client-metadata-fetcher';
import { OAuthTokenGenerator } from '../../domain/oauth/services/oauth-token-generator';
import { PrismaOAuthClientRepository } from '../database/prisma/repositories/prisma-oauth-client.repository';
import { PrismaOAuthCodeRepository } from '../database/prisma/repositories/prisma-oauth-code.repository';
import { PrismaOAuthGrantRepository } from '../database/prisma/repositories/prisma-oauth-grant.repository';
import { PrismaOAuthTokenRepository } from '../database/prisma/repositories/prisma-oauth-token.repository';
import { OAuthConsentController } from '../http/controllers/oauth-consent.controller';
import { OAuthController } from '../http/controllers/oauth.controller';
import { OAuthMetadataController } from '../http/controllers/oauth-metadata.controller';
import { CryptoOAuthTokenGenerator } from '../oauth/crypto-oauth-token-generator';
import { OAuthCleanupService } from '../oauth/oauth-cleanup.service';
import { createOAuthSettings } from '../oauth/oauth-settings.factory';
import { SafeHttpClientMetadataFetcher } from '../oauth/safe-http-client-metadata-fetcher';

const HOUR_IN_MS = 60 * 60 * 1000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  controllers: [
    AuthController,
    PersonalAccessTokensController,
    AdminUsersController,
    OAuthMetadataController,
    OAuthController,
    OAuthConsentController,
  ],
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
    UpdateThemePreferenceUseCase,
    GoogleSignInUseCase,
    DeleteUserByEmailUseCase,
    CreatePersonalAccessTokenUseCase,
    ListPersonalAccessTokensUseCase,
    RevokePersonalAccessTokenUseCase,
    AuthenticatePersonalAccessTokenUseCase,
    CryptoPersonalAccessTokenGenerator,
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
      provide: PersonalAccessTokenGenerator,
      useExisting: CryptoPersonalAccessTokenGenerator,
    },
    {
      provide: PersonalAccessTokenRepository,
      useClass: PrismaPersonalAccessTokenRepository,
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
    // OAuth 2.1 (atrás de OAUTH_ENABLED; sem a flag as rotas respondem 404).
    {
      provide: OAuthSettings,
      inject: [ConfigService],
      useFactory: createOAuthSettings,
    },
    RegisterOAuthClientUseCase,
    ResolveOAuthClientUseCase,
    PreviewAuthorizationUseCase,
    DecideAuthorizationUseCase,
    ExchangeAuthorizationCodeUseCase,
    RefreshOAuthTokenUseCase,
    RevokeOAuthTokenUseCase,
    ListOAuthGrantsUseCase,
    RevokeOAuthGrantUseCase,
    AuthenticateOAuthAccessTokenUseCase,
    GetAuthorizationServerMetadataUseCase,
    AuthorizationRequestValidator,
    OAuthTokenIssuer,
    OAuthCleanupService,
    CryptoOAuthTokenGenerator,
    { provide: OAuthTokenGenerator, useExisting: CryptoOAuthTokenGenerator },
    { provide: ClientMetadataFetcher, useClass: SafeHttpClientMetadataFetcher },
    { provide: OAuthClientRepository, useClass: PrismaOAuthClientRepository },
    { provide: OAuthGrantRepository, useClass: PrismaOAuthGrantRepository },
    { provide: OAuthCodeRepository, useClass: PrismaOAuthCodeRepository },
    { provide: OAuthTokenRepository, useClass: PrismaOAuthTokenRepository },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
