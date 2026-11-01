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
import { AuthenticateUserUseCase } from '../../../application/auth/use-cases/authenticate-user.use-case';
import { GetUserProfileUseCase } from '../../../application/auth/use-cases/get-user-profile.use-case';
import { UnauthorizedError } from '../../../application/shared/errors/unauthorized.error';
import type { AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import { LoginRateLimiter } from '../../auth/login-rate-limiter.service';
import { Public } from '../../auth/public.decorator';
import { TokenService } from '../../auth/token.service';
import {
  AuthenticatedUserResponse,
  LoginResponse,
} from '../schemas/http.schemas';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly tokenService: TokenService,
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
  async login(@Body() dto: LoginDto) {
    this.loginRateLimiter.assertAllowed();

    try {
      const user = await this.authenticateUser.execute({
        username: dto.username,
        password: dto.password,
      });

      const { token, expiresAt } = this.tokenService.sign(user.id);

      this.loginRateLimiter.registerSuccess();

      return {
        accessToken: token,
        tokenType: 'Bearer' as const,
        expiresIn: this.tokenService.expiresInSeconds,
        expiresAt,
        user: {
          id: user.id,
          username: user.username,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
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
  async me(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    const user = await this.getUserProfile.execute(userId);

    return {
      id: user.id,
      username: user.username,
    };
  }
}
