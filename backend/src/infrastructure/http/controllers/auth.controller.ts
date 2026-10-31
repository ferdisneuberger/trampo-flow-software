import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from '../../../application/auth/dtos/login.dto';
import { AuthService } from '../../auth/auth.service';
import type { AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../../auth/login-rate-limiter.service';
import { Public } from '../../auth/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginRateLimiter: LoginRateLimiter,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    this.loginRateLimiter.assertAllowed();

    try {
      const result = this.authService.login(dto.username, dto.password);

      this.loginRateLimiter.registerSuccess();

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.loginRateLimiter.registerFailure();
      }

      throw error;
    }
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    const username = request.user?.sub;

    if (!username) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    return this.authService.getProfile(username);
  }
}
