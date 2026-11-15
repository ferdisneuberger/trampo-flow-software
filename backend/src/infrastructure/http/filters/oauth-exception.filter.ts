import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { OAuthError } from '../../../application/oauth/errors/oauth.error';

/**
 * Formato de erro da RFC 6749 para os endpoints públicos de OAuth:
 * `{ "error": "invalid_grant", "error_description": "…" }`, sempre sem cache.
 */
@Catch()
export class OAuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache');

    if (exception instanceof OAuthError) {
      void reply
        .status(exception.status)
        .send({ error: exception.code, error_description: exception.message });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status === 429) {
        const body = exception.getResponse() as { retryAfterSeconds?: number };

        if (body.retryAfterSeconds) {
          reply.header('Retry-After', String(body.retryAfterSeconds));
        }

        void reply.status(429).send({
          error: 'temporarily_unavailable',
          error_description:
            'Muitas requisições. Tente novamente em instantes.',
        });
        return;
      }

      if (status < 500) {
        void reply.status(status).send({
          error: 'invalid_request',
          error_description: 'Requisição inválida.',
        });
        return;
      }
    }

    // Nunca devolve o erro interno (pode carregar dados do pedido).
    this.logger.error(
      exception instanceof Error ? exception.message : 'Erro desconhecido',
    );
    void reply.status(500).send({
      error: 'server_error',
      error_description: 'Erro interno.',
    });
  }
}
