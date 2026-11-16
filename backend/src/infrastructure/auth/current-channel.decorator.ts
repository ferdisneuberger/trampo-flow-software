import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { MetricChannel } from '../../application/shared/metrics/app-metrics';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/** Como a requisição chegou: interface (jwt), token de integração ou OAuth. */
export function channelOf(request: AuthenticatedRequest): MetricChannel {
  switch (request.user?.authMethod) {
    case 'pat':
      return 'agent_token';
    case 'oauth':
      return 'agent_oauth';
    default:
      return 'web';
  }
}

export const CurrentChannel = createParamDecorator(
  (_data: unknown, context: ExecutionContext): MetricChannel =>
    channelOf(context.switchToHttp().getRequest<AuthenticatedRequest>()),
);
