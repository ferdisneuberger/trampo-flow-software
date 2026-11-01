import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticateUserUseCase } from '../../application/auth/use-cases/authenticate-user.use-case';
import { GetUserProfileUseCase } from '../../application/auth/use-cases/get-user-profile.use-case';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { PasswordHasher } from '../../domain/users/services/password-hasher';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../auth/login-rate-limiter.service';
import { ScryptPasswordHasher } from '../auth/scrypt-password-hasher';
import { TokenService } from '../auth/token.service';
import { UserBootstrapService } from '../auth/user-bootstrap.service';
import { PrismaUserRepository } from '../database/prisma/repositories/prisma-user.repository';
import { AuthController } from '../http/controllers/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    AuthenticateUserUseCase,
    GetUserProfileUseCase,
    LoginRateLimiter,
    ScryptPasswordHasher,
    TokenService,
    UserBootstrapService,
    {
      provide: PasswordHasher,
      useExisting: ScryptPasswordHasher,
    },
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
