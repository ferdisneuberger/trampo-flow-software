import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AppMetrics,
  NoopAppMetrics,
  type GuardDenialReason,
  type MetricAuthKind,
} from '../../application/shared/metrics/app-metrics';
import { OAuthSettings } from '../../application/oauth/services/oauth-settings';
import { AuthenticateOAuthAccessTokenUseCase } from '../../application/oauth/use-cases/authenticate-oauth-access-token.use-case';
import { isOAuthAccessToken } from '../../domain/oauth/services/oauth-token-generator';
import { AuthenticatePersonalAccessTokenUseCase } from '../../application/auth/use-cases/authenticate-personal-access-token.use-case';
import { hasScope, SCOPE_APPLICATIONS_WRITE } from '../../domain/auth/scopes';
import { isPersonalAccessToken } from '../../domain/auth/services/personal-access-token-generator';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { IS_OAUTH_ROUTE_KEY } from './oauth-route.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { RateLimiterService } from './rate-limiter.service';
import { REQUIRED_SCOPE_KEY } from './required-scope.decorator';
import { IS_SESSION_ONLY_KEY } from './session-only.decorator';
import { TokenService } from './token.service';

export type AuthenticatedUser =
  | { sub: string; authMethod: 'jwt' }
  | { sub: string; authMethod: 'pat'; tokenId: string; scopes: string[] }
  | {
      sub: string;
      authMethod: 'oauth';
      tokenId: string;
      grantId: string;
      scopes: string[];
    };

export type AuthenticatedRequest = FastifyRequest & {
  user?: AuthenticatedUser;
};

/** Escritas por token de integração: 60 por minuto por token. */
export const PAT_WRITE_LIMIT = 60;
export const PAT_WRITE_WINDOW_MS = 60 * 1000;

const READ_METHODS = new Set(['GET', 'HEAD']);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
    private readonly authenticatePersonalAccessToken: AuthenticatePersonalAccessTokenUseCase,
    private readonly rateLimiter: RateLimiterService,
    private readonly authenticateOAuthAccessToken: AuthenticateOAuthAccessTokenUseCase,
    private readonly oauthSettings: OAuthSettings,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    // Entrega escura: sem OAUTH_ENABLED as rotas do OAuth não existem.
    if (
      !this.oauthSettings.enabled &&
      this.reflector.getAllAndOverride<boolean>(IS_OAUTH_ROUTE_KEY, targets)
    ) {
      throw new NotFoundException();
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw this.denied(
        'missing_token',
        'anonymous',
        new UnauthorizedException('Token de acesso ausente.'),
      );
    }

    const [scheme, token, ...rest] = authorization.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      throw this.denied(
        'invalid_token',
        'anonymous',
        new UnauthorizedException('Cabeçalho Authorization inválido.'),
      );
    }

    const isPat = isPersonalAccessToken(token);
    const isOAuth = this.oauthSettings.enabled && isOAuthAccessToken(token);

    if (isPat || isOAuth) {
      const isSessionOnly = this.reflector.getAllAndOverride<boolean>(
        IS_SESSION_ONLY_KEY,
        targets,
      );

      if (isSessionOnly) {
        throw this.denied(
          'session_only',
          isPat ? 'pat' : 'oauth',
          new ForbiddenException(
            'Esta rota exige login na interface; tokens de integração não têm acesso.',
          ),
        );
      }

      if (isPat) {
        const { userId, tokenId, scopes } =
          await this.authenticatePersonalAccessToken
            .execute(token)
            .catch((error: unknown) => {
              this.metrics.personalToken('rejected', 'unknown');

              throw this.denied('invalid_token', 'pat', error);
            });

        this.assertScope(context, targets, scopes, 'pat');
        this.metrics.personalToken(
          'authenticated',
          scopes.includes(SCOPE_APPLICATIONS_WRITE) ? 'read_write' : 'read',
        );
        this.limitWrites(request, `pat:write:${tokenId}`);

        request.user = { sub: userId, authMethod: 'pat', tokenId, scopes };

        return true;
      }

      const { userId, tokenId, grantId, scopes } =
        await this.authenticateOAuthAccessToken
          .execute(token)
          .catch((error: unknown) => {
            throw this.denied('invalid_token', 'oauth', error);
          });

      this.assertScope(context, targets, scopes, 'oauth');
      this.limitWrites(request, `oauth:write:${grantId}`);

      request.user = {
        sub: userId,
        authMethod: 'oauth',
        tokenId,
        grantId,
        scopes,
      };

      return true;
    }

    let payload: ReturnType<TokenService['verify']>;

    try {
      payload = this.tokenService.verify(token);
    } catch (error) {
      const expired =
        error instanceof UnauthorizedException &&
        (error.getResponse() as { code?: string }).code === 'TOKEN_EXPIRED';

      throw this.denied(
        expired ? 'expired_token' : 'invalid_token',
        'jwt',
        error,
      );
    }

    const userExists = await this.userRepository.existsById(payload.sub);

    if (!userExists) {
      throw this.denied(
        'invalid_token',
        'jwt',
        new UnauthorizedException('Token inválido ou expirado.'),
      );
    }

    request.user = { sub: payload.sub, authMethod: 'jwt' };

    return true;
  }

  /** Registra a negação e devolve a própria exceção, para ser lançada por quem chamou. */
  private denied<T>(
    reason: GuardDenialReason,
    auth: MetricAuthKind,
    error: T,
  ): T {
    this.metrics.guardDenied(reason, auth);

    return error;
  }

  private limitWrites(request: AuthenticatedRequest, key: string): void {
    if (!READ_METHODS.has(request.method)) {
      this.rateLimiter.consume(key, PAT_WRITE_LIMIT, PAT_WRITE_WINDOW_MS);
    }
  }

  /**
   * Negado por padrão: o token só alcança rotas que declaram um escopo
   * (`@RequiredScope`) e só se o token o possuir.
   */
  private assertScope(
    context: ExecutionContext,
    targets: (object | undefined)[],
    granted: readonly string[],
    auth: MetricAuthKind,
  ): void {
    const required = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_SCOPE_KEY,
      targets as never,
    );

    if (!required) {
      throw this.denied(
        'route_closed',
        auth,
        new ForbiddenException(
          'Esta rota não está disponível para tokens de integração.',
        ),
      );
    }

    if (hasScope(granted, required)) {
      return;
    }

    context
      .switchToHttp()
      .getResponse<FastifyReply>()
      .header(
        'WWW-Authenticate',
        this.oauthSettings.enabled
          ? `Bearer error="insufficient_scope", scope="${required}", resource_metadata="${this.oauthSettings.protectedResourceMetadataUrl}"`
          : `Bearer error="insufficient_scope", scope="${required}"`,
      );

    throw this.denied(
      'insufficient_scope',
      auth,
      new ForbiddenException(
        'Este token não tem permissão para esta ação. Crie um token com permissão de leitura e escrita.',
      ),
    );
  }
}
