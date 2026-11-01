import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApplicationError } from '../../../application/shared/errors/application.error';
import { ConflictError } from '../../../application/shared/errors/conflict.error';
import { NotFoundError } from '../../../application/shared/errors/not-found.error';
import { DomainError } from '../../../domain/shared/errors/domain.error';

@Catch(DomainError, ApplicationError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError | ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const statusCode =
      exception instanceof NotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof ConflictError
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST;

    response.status(statusCode).send({
      error: exception.code,
      message: exception.message,
    });
  }
}
