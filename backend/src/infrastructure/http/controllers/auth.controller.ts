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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginDto } from '../../../application/auth/dtos/login.dto';
import { AuthService } from '../../auth/auth.service';
import type { AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../../auth/login-rate-limiter.service';
import { Public } from '../../auth/public.decorator';
import {
  AuthenticatedUserResponse,
  LoginResponse,
} from '../schemas/http.schemas';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginRateLimiter: LoginRateLimiter,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica e devolve um token JWT' })
  @ApiOkResponse({ type: LoginResponse })
  @ApiResponse({ status: 401, description: 'Usuário ou senha inválidos.' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas de login na janela atual.',
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Devolve o usuário autenticado' })
  @ApiOkResponse({ type: AuthenticatedUserResponse })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  me(@Req() request: AuthenticatedRequest) {
    const username = request.user?.sub;

    if (!username) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    return this.authService.getProfile(username);
  }
}
