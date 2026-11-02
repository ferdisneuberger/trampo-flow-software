import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticateUserUseCase } from '../../application/auth/use-cases/authenticate-user.use-case';
import { CreateSessionUseCase } from '../../application/auth/use-cases/create-session.use-case';
import { GetUserProfileUseCase } from '../../application/auth/use-cases/get-user-profile.use-case';
import { LogoutUseCase } from '../../application/auth/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../application/auth/use-cases/refresh-session.use-case';
import { RefreshTokenRepository } from '../../domain/auth/repositories/refresh-token.repository';
import { RefreshTokenGenerator } from '../../domain/auth/services/refresh-token-generator';
import { RefreshTokenPolicy } from '../../domain/auth/services/refresh-token-policy';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../domain/users/services/password-hasher';
import { CryptoRefreshTokenGenerator } from '../auth/crypto-refresh-token-generator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../auth/login-rate-limiter.service';
import { ScryptPasswordHasher } from '../auth/scrypt-password-hasher';
import { TokenService } from '../auth/token.service';
import { UserBootstrapService } from '../auth/user-bootstrap.service';
import { PrismaRefreshTokenRepository } from '../database/prisma/repositories/prisma-refresh-token.repository';
import { PrismaUserRepository } from '../database/prisma/repositories/prisma-user.repository';
import { AuthController } from '../http/controllers/auth.controller';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  controllers: [AuthController],
  providers: [
    AuthenticateUserUseCase,
    CreateSessionUseCase,
    GetUserProfileUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    LoginRateLimiter,
    ScryptPasswordHasher,
    TokenService,
    UserBootstrapService,
    CryptoRefreshTokenGenerator,
    {
      provide: PasswordHasher,
      useExisting: ScryptPasswordHasher,
    },
    {
      provide: RefreshTokenGenerator,
      useExisting: CryptoRefreshTokenGenerator,
    },
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
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
            configService.get<string>('REFRESH_TOKEN_TTL_DAYS'),
            7,
          ) * DAY_IN_MS,
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
