import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoginDto } from '../../../application/auth/dtos/login.dto';
import { AuthenticateUserUseCase } from '../../../application/auth/use-cases/authenticate-user.use-case';
import { CreateSessionUseCase } from '../../../application/auth/use-cases/create-session.use-case';
import { GetUserProfileUseCase } from '../../../application/auth/use-cases/get-user-profile.use-case';
import { LogoutUseCase } from '../../../application/auth/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../../application/auth/use-cases/refresh-session.use-case';
import { UnauthorizedError } from '../../../application/shared/errors/unauthorized.error';
import { CurrentUserId } from '../../auth/current-user-id.decorator';
import { LoginRateLimiter } from '../../auth/login-rate-limiter.service';
import { Public } from '../../auth/public.decorator';
import { TokenService } from '../../auth/token.service';
import {
  AuthenticatedUserResponse,
  LoginResponse,
  RefreshResponse,
} from '../schemas/http.schemas';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;
  private readonly allowedOrigins: string[];

  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly createSession: CreateSessionUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutSession: LogoutUseCase,
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly tokenService: TokenService,
    private readonly loginRateLimiter: LoginRateLimiter,
    configService: ConfigService,
  ) {
    this.cookieSecure = configService.get<string>('NODE_ENV') === 'production';
    this.allowedOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

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
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.loginRateLimiter.assertAllowed();

    try {
      const user = await this.authenticateUser.execute({
        username: dto.username,
        password: dto.password,
      });

      const session = await this.createSession.execute({
        userId: user.id,
        userAgent: request.headers['user-agent'] ?? null,
      });

      this.setRefreshCookie(reply, session);

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

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access token usando o cookie de sessão' })
  @ApiOkResponse({ type: RefreshResponse })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, expirada ou reutilizada.',
  })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.assertSameOrigin(request);

    const refreshToken = request.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException({
        message: 'Sessão ausente.',
        code: 'MISSING_REFRESH_TOKEN',
      });
    }

    const session = await this.refreshSession.execute({
      refreshToken,
      userAgent: request.headers['user-agent'] ?? null,
    });

    this.setRefreshCookie(reply, session);

    const { token, expiresAt } = this.tokenService.sign(session.userId);

    return {
      accessToken: token,
      tokenType: 'Bearer' as const,
      expiresIn: this.tokenService.expiresInSeconds,
      expiresAt,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerra a sessão e revoga o refresh token' })
  @ApiNoContentResponse({ description: 'Sessão encerrada.' })
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    this.assertSameOrigin(request);

    await this.logoutSession.execute(request.cookies?.[REFRESH_COOKIE]);

    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Devolve o usuário autenticado' })
  @ApiOkResponse({ type: AuthenticatedUserResponse })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  async me(@CurrentUserId() userId: string) {
    const user = await this.getUserProfile.execute(userId);

    return {
      id: user.id,
      username: user.username,
    };
  }

  private setRefreshCookie(
    reply: FastifyReply,
    session: { refreshToken: string; refreshTokenExpiresAt: Date },
  ): void {
    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'strict',
      path: '/',
      expires: session.refreshTokenExpiresAt,
    });
  }

  private assertSameOrigin(request: FastifyRequest): void {
    const origin = request.headers.origin;

    if (!origin || this.allowedOrigins.length === 0) {
      return;
    }

    if (!this.allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origem não permitida.');
    }
  }
}
