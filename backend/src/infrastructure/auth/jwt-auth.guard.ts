import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AuthenticatePersonalAccessTokenUseCase } from '../../application/auth/use-cases/authenticate-personal-access-token.use-case';
import { isPersonalAccessToken } from '../../domain/auth/services/personal-access-token-generator';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { IS_PUBLIC_KEY } from './public.decorator';
import { RateLimiterService } from './rate-limiter.service';
import { IS_SESSION_ONLY_KEY } from './session-only.decorator';
import { TokenService } from './token.service';

export type AuthenticatedUser =
  | { sub: string; authMethod: 'jwt' }
  | { sub: string; authMethod: 'pat'; tokenId: string };

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
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
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    const [scheme, token, ...rest] = authorization.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      throw new UnauthorizedException('Cabeçalho Authorization inválido.');
    }

    if (isPersonalAccessToken(token)) {
      const isSessionOnly = this.reflector.getAllAndOverride<boolean>(
        IS_SESSION_ONLY_KEY,
        targets,
      );

      if (isSessionOnly) {
        throw new ForbiddenException(
          'Esta rota exige login na interface; tokens de integração não têm acesso.',
        );
      }

      const { userId, tokenId } =
        await this.authenticatePersonalAccessToken.execute(token);

      if (!READ_METHODS.has(request.method)) {
        this.rateLimiter.consume(
          `pat:write:${tokenId}`,
          PAT_WRITE_LIMIT,
          PAT_WRITE_WINDOW_MS,
        );
      }

      request.user = { sub: userId, authMethod: 'pat', tokenId };

      return true;
    }

    const payload = this.tokenService.verify(token);
    const userExists = await this.userRepository.existsById(payload.sub);

    if (!userExists) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    request.user = { sub: payload.sub, authMethod: 'jwt' };

    return true;
  }
}
