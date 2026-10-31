import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../auth/login-rate-limiter.service';
import { TokenService } from '../auth/token.service';
import { AuthController } from '../http/controllers/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    LoginRateLimiter,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
