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
import { ForgotPasswordDto } from '../../../application/auth/dtos/forgot-password.dto';
import { LoginDto } from '../../../application/auth/dtos/login.dto';
import { ResetPasswordDto } from '../../../application/auth/dtos/reset-password.dto';
import { RegisterUserDto } from '../../../application/auth/dtos/register-user.dto';
import { VerifyEmailDto } from '../../../application/auth/dtos/verify-email.dto';
import { AuthenticateUserUseCase } from '../../../application/auth/use-cases/authenticate-user.use-case';
import { CreateSessionUseCase } from '../../../application/auth/use-cases/create-session.use-case';
import { ForgotPasswordUseCase } from '../../../application/auth/use-cases/forgot-password.use-case';
import { GetUserProfileUseCase } from '../../../application/auth/use-cases/get-user-profile.use-case';
import { LogoutUseCase } from '../../../application/auth/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../../application/auth/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../../../application/auth/use-cases/register-user.use-case';
import { ResendVerificationUseCase } from '../../../application/auth/use-cases/resend-verification.use-case';
import { ResetPasswordUseCase } from '../../../application/auth/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from '../../../application/auth/use-cases/verify-email.use-case';
import { UnauthorizedError } from '../../../application/shared/errors/unauthorized.error';
import { CurrentUserId } from '../../auth/current-user-id.decorator';
import { LoginRateLimiter } from '../../auth/login-rate-limiter.service';
import { Public } from '../../auth/public.decorator';
import { RateLimiterService } from '../../auth/rate-limiter.service';
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
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly resendVerification: ResendVerificationUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly rateLimiter: RateLimiterService,
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
        email: dto.email,
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
          email: user.email ?? '',
          emailVerified: user.isEmailVerified,
          hasPassword: user.passwordHash !== null,
          termsAccepted: user.termsAcceptedAt !== null,
          verificationResendAvailableAt: null,
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
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma conta e envia o código de verificação' })
  @ApiResponse({ status: 201, description: 'Cadastro recebido.' })
  @ApiResponse({ status: 403, description: 'Cadastro desabilitado.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas.' })
  async register(@Body() dto: RegisterUserDto, @Req() request: FastifyRequest) {
    this.rateLimiter.consume(`register:ip:${request.ip}`, 5, 60 * 60 * 1000);

    await this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      termsAccepted: dto.termsAccepted,
    });

    return {
      message:
        'Se o e-mail puder ser cadastrado, enviaremos um código de confirmação.',
    };
  }

  @Public()
  @Post('verification/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirma o e-mail com o código recebido' })
  @ApiResponse({ status: 204, description: 'E-mail confirmado.' })
  @ApiResponse({
    status: 400,
    description: 'Código inválido, expirado ou já utilizado.',
  })
  @ApiResponse({ status: 429, description: 'Muitas tentativas.' })
  async confirmVerification(
    @Body() dto: VerifyEmailDto,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    this.rateLimiter.consume(`verification:minute:${request.ip}`, 5, 60 * 1000);
    this.rateLimiter.consume(
      `verification:hour:${request.ip}`,
      20,
      60 * 60 * 1000,
    );

    await this.verifyEmail.execute({ token: dto.token });
  }

  @Post('verification/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Reenvia o código de verificação' })
  @ApiResponse({ status: 202, description: 'Reenvio processado.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas.' })
  async resendVerificationEmail(
    @CurrentUserId() userId: string,
    @Req() request: FastifyRequest,
  ) {
    this.rateLimiter.consume(
      `verification:resend:user:${userId}`,
      5,
      60 * 60 * 1000,
    );
    this.rateLimiter.consume(
      `verification:resend:ip:${request.ip}`,
      10,
      60 * 60 * 1000,
    );

    return this.resendVerification.execute(userId);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Solicita um link de recuperação de senha' })
  @ApiResponse({ status: 202, description: 'Solicitação processada.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas.' })
  async forgotPasswordRequest(
    @Body() dto: ForgotPasswordDto,
    @Req() request: FastifyRequest,
  ) {
    this.rateLimiter.consume(
      `password:forgot:ip:${request.ip}`,
      10,
      60 * 60 * 1000,
    );
    this.rateLimiter.consume(
      `password:forgot:email:${dto.email}`,
      3,
      60 * 60 * 1000,
    );

    await this.forgotPassword.execute({ email: dto.email });

    return {
      message:
        'Se houver uma conta com esse e-mail, enviaremos um link de recuperação.',
    };
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Redefine a senha usando o token recebido' })
  @ApiResponse({ status: 204, description: 'Senha redefinida.' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas.' })
  async resetPasswordRequest(
    @Body() dto: ResetPasswordDto,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    this.rateLimiter.consume(
      `password:reset:ip:${request.ip}`,
      5,
      60 * 60 * 1000,
    );

    await this.resetPassword.execute({
      token: dto.token,
      password: dto.password,
    });
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
    const { user, verificationResendAvailableAt } =
      await this.getUserProfile.execute(userId);

    return {
      id: user.id,
      email: user.email ?? '',
      emailVerified: user.isEmailVerified,
      hasPassword: user.passwordHash !== null,
      termsAccepted: user.termsAcceptedAt !== null,
      verificationResendAvailableAt:
        verificationResendAvailableAt?.toISOString() ?? null,
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
