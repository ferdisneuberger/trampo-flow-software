import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

export function requireUserId(request: AuthenticatedRequest): string {
  const userId = request.user?.sub;

  if (!userId) {
    throw new UnauthorizedException('Token inválido ou expirado.');
  }

  return userId;
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    requireUserId(context.switchToHttp().getRequest<AuthenticatedRequest>()),
);
