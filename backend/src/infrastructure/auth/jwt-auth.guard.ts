import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TokenService, type JwtPayload } from './token.service';

export type AuthenticatedRequest = FastifyRequest & {
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

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

    const payload = this.tokenService.verify(token);

    if (!this.authService.isCurrentUser(payload.sub)) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    request.user = payload;

    return true;
  }
}
